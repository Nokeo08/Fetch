import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createDatabase, runMigrations, cleanupExpiredSessions, cleanupExpiredRateLimits, closeDatabase } from "./db";
import { getConfig, validateConfig } from "./config";
import { createListsService, createSectionsService, createItemsService } from "./services";
import { errorHandler, notFoundHandler, requestLogger, securityHeaders } from "./middleware";
import type { ApiResponse, ItemStatus } from "shared/dist";
import type { Database } from "bun:sqlite";

const VALID_STATUSES: ItemStatus[] = ["active", "completed", "uncertain"];

function parseId(param: string): number | null {
    const id = parseInt(param, 10);
    return isNaN(id) || id <= 0 ? null : id;
}

function validateStatus(status: unknown): ItemStatus | null {
    if (typeof status !== "string") return null;
    return VALID_STATUSES.includes(status as ItemStatus) ? (status as ItemStatus) : null;
}

const config = getConfig();
validateConfig(config);

const db = createDatabase(config.database.path);
runMigrations(db);

cleanupExpiredSessions(db);
cleanupExpiredRateLimits(db);

const listsService = createListsService(db);
const sectionsService = createSectionsService(db);
const itemsService = createItemsService(db);

export type AppVariables = {
    requestId: string;
    db: Database;
};

export function checkDatabaseHealth(db: Database): { status: string; latency?: number } {
    try {
        const start = Date.now();
        db.query("SELECT 1").get();
        const latency = Date.now() - start;
        return { status: "connected", latency };
    } catch (err) {
        return { status: "disconnected" };
    }
}

export const app = new Hono<{ Variables: AppVariables }>()
    .use("*", requestLogger())
    .use("*", errorHandler())
    .use("*", securityHeaders())
    .use("/static/*", serveStatic({ root: "./" }))

    .get("/health", (c) => {
        const dbHealth = checkDatabaseHealth(db);
        const isHealthy = dbHealth.status === "connected";

        return c.json(
            {
                status: isHealthy ? "healthy" : "unhealthy",
                timestamp: new Date().toISOString(),
                database: dbHealth,
            },
            isHealthy ? 200 : 503
        );
    })

    .get("/", (c) => {
        return c.text("Fetch Shopping List API");
    })

    .get("/hello", async (c) => {
        const data: ApiResponse = {
            success: true,
            data: {
                message: "Hello Fetch!",
            },
        };
        return c.json(data, { status: 200 });
    })

    .route("/api/v1", createApiRoutes(listsService, sectionsService, itemsService))

    .notFound(notFoundHandler);

function createApiRoutes(
    listsService: ReturnType<typeof createListsService>,
    sectionsService: ReturnType<typeof createSectionsService>,
    itemsService: ReturnType<typeof createItemsService>
) {
    return new Hono<{ Variables: AppVariables }>()
        .get("/lists", (c) => {
            const lists = listsService.getAll();
            return c.json<ApiResponse>({ success: true, data: lists });
        })

        .get("/lists/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const list = listsService.getById(id);
            if (!list) {
                return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: list });
        })

        .post("/lists", async (c) => {
            const body = await c.req.json<{ name: string; icon?: string }>();
            if (!body.name || body.name.length < 1 || body.name.length > 100) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-100 characters" }, 400);
            }
            const list = listsService.create(body.name, body.icon);
            return c.json<ApiResponse>({ success: true, data: list }, 201);
        })

        .put("/lists/:id", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const body = await c.req.json<{ name?: string; icon?: string; isActive?: boolean }>();
            const list = listsService.update(id, body);
            if (!list) {
                return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: list });
        })

        .delete("/lists/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            try {
                const deleted = listsService.delete(id);
                if (!deleted) {
                    return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
                }
                return c.json<ApiResponse>({ success: true });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to delete list";
                return c.json<ApiResponse>({ success: false, error: message }, 400);
            }
        })

        .post("/lists/:id/activate", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const list = listsService.setActive(id);
            if (!list) {
                return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: list });
        })

        .post("/lists/reorder", async (c) => {
            const body = await c.req.json<{ ids: number[] }>();
            listsService.reorder(body.ids);
            return c.json<ApiResponse>({ success: true });
        })

        .get("/lists/:id/sections", (c) => {
            const listId = parseId(c.req.param("id"));
            if (listId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const sections = sectionsService.getByListIdWithItems(listId);
            return c.json<ApiResponse>({ success: true, data: sections });
        })

        .post("/lists/:id/sections", async (c) => {
            const listId = parseId(c.req.param("id"));
            if (listId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const body = await c.req.json<{ name: string }>();
            if (!body.name || body.name.length < 1 || body.name.length > 100) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-100 characters" }, 400);
            }
            const section = sectionsService.create(listId, body.name);
            return c.json<ApiResponse>({ success: true, data: section }, 201);
        })

        .get("/sections/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid section ID" }, 400);
            }
            const section = sectionsService.getById(id);
            if (!section) {
                return c.json<ApiResponse>({ success: false, error: "Section not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: section });
        })

        .put("/sections/:id", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid section ID" }, 400);
            }
            const body = await c.req.json<{ name: string }>();
            const section = sectionsService.update(id, body.name);
            if (!section) {
                return c.json<ApiResponse>({ success: false, error: "Section not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: section });
        })

        .delete("/sections/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid section ID" }, 400);
            }
            const deleted = sectionsService.delete(id);
            if (!deleted) {
                return c.json<ApiResponse>({ success: false, error: "Section not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true });
        })

        .post("/sections/reorder", async (c) => {
            const body = await c.req.json<{ ids: number[] }>();
            sectionsService.reorder(body.ids);
            return c.json<ApiResponse>({ success: true });
        })

        .get("/sections/:id/items", (c) => {
            const sectionId = parseId(c.req.param("id"));
            if (sectionId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid section ID" }, 400);
            }
            const items = sectionsService.getItems(sectionId);
            return c.json<ApiResponse>({ success: true, data: items });
        })

        .post("/sections/:id/items", async (c) => {
            const sectionId = parseId(c.req.param("id"));
            if (sectionId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid section ID" }, 400);
            }
            const body = await c.req.json<{ name: string; description?: string; quantity?: string }>();
            if (!body.name || body.name.length < 1 || body.name.length > 200) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-200 characters" }, 400);
            }
            const item = itemsService.create(sectionId, body.name, body.description, body.quantity);
            return c.json<ApiResponse>({ success: true, data: item }, 201);
        })

        .get("/items/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid item ID" }, 400);
            }
            const item = itemsService.getById(id);
            if (!item) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: item });
        })

        .put("/items/:id", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid item ID" }, 400);
            }
            const body = await c.req.json<{ name?: string; description?: string | null; quantity?: string | null; status?: string }>();
            const updateData: { name?: string; description?: string | null; quantity?: string | null; status?: ItemStatus } = {};
            if (body.name !== undefined) updateData.name = body.name;
            if (body.description !== undefined) updateData.description = body.description;
            if (body.quantity !== undefined) updateData.quantity = body.quantity;
            if (body.status !== undefined) {
                const validatedStatus = validateStatus(body.status);
                if (validatedStatus === null) {
                    return c.json<ApiResponse>({ success: false, error: "Invalid status. Must be one of: active, completed, uncertain" }, 400);
                }
                updateData.status = validatedStatus;
            }
            const item = itemsService.update(id, updateData);
            if (!item) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: item });
        })

        .delete("/items/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid item ID" }, 400);
            }
            const deleted = itemsService.delete(id);
            if (!deleted) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true });
        })

        .post("/items/:id/move", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid item ID" }, 400);
            }
            const body = await c.req.json<{ targetSectionId: number }>();
            const item = itemsService.moveToSection(id, body.targetSectionId);
            if (!item) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: item });
        })

        .post("/items/reorder", async (c) => {
            const body = await c.req.json<{ ids: number[] }>();
            itemsService.reorder(body.ids);
            return c.json<ApiResponse>({ success: true });
        })

        .get("/history", (c) => {
            const limit = parseInt(c.req.query("limit") || "100", 10);
            const history = itemsService.getHistory(limit);
            return c.json<ApiResponse>({ success: true, data: history });
        })

        .get("/history/search", (c) => {
            const query = c.req.query("q") || "";
            const limit = parseInt(c.req.query("limit") || "5", 10);
            const results = itemsService.searchHistory(query, limit);
            return c.json<ApiResponse>({ success: true, data: results });
        });
}

export { db, closeDatabase };
export default app;
