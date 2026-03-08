import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(import.meta.dir, "../../.env") });

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createDatabase, runMigrations, cleanupExpiredSessions, cleanupExpiredRateLimits, closeDatabase } from "./db";
import { getConfig, validateConfig } from "./config";
import {
    createListsService,
    createSectionsService,
    createItemsService,
    createSessionsService,
    createRateLimitsService,
    createTemplatesService,
    createImportExportService,
    validateImportData,
} from "./services";
import {
    errorHandler,
    notFoundHandler,
    requestLogger,
    securityHeaders,
    corsHeaders,
    requireAuth,
    createSessionCookie,
    clearSessionCookie,
    constantTimeEquals,
    type AuthVariables,
} from "./middleware";
import { getCookie } from "hono/cookie";
import { wsApp } from "./websocket";
import {
    broadcastListCreated,
    broadcastListUpdated,
    broadcastListDeleted,
    broadcastSectionCreated,
    broadcastSectionUpdated,
    broadcastSectionDeleted,
    broadcastSectionReordered,
    broadcastItemCreated,
    broadcastItemUpdated,
    broadcastItemDeleted,
    broadcastItemMoved,
} from "./sync/broadcast";
import type { ApiResponse, ItemStatus, ExportData, ImportOptions } from "shared/dist";
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
const sessionsService = createSessionsService(db);
const rateLimitsService = createRateLimitsService(db, config.rateLimit);
const templatesService = createTemplatesService(db);
const importExportService = createImportExportService(db);

export type AppVariables = {
    requestId: string;
    db: Database;
} & AuthVariables;

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
    .use("*", corsHeaders({ origins: ["*"], credentials: true }))
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

    .post("/api/login", async (c) => {
        if (config.auth.disabled) {
            return c.json<ApiResponse>({ success: true, data: { message: "Authentication disabled" } });
        }

        const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
            c.req.header("x-real-ip") ||
            "unknown";

        if (rateLimitsService.isLocked(ip)) {
            const remaining = rateLimitsService.getLockoutRemaining(ip);
            c.header("Retry-After", String(Math.ceil(remaining / 1000)));
            return c.json<ApiResponse>(
                { success: false, error: "Too many failed attempts. Please try again later." },
                429
            );
        }

        let body: { password?: string };
        try {
            body = await c.req.json<{ password?: string }>();
        } catch {
            return c.json<ApiResponse>({ success: false, error: "Invalid request body" }, 400);
        }

        const { password } = body;

        if (!password || typeof password !== "string") {
            rateLimitsService.recordAttempt(ip);
            return c.json<ApiResponse>({ success: false, error: "Invalid credentials" }, 401);
        }

        if (!constantTimeEquals(password, config.auth.password)) {
            rateLimitsService.recordAttempt(ip);
            return c.json<ApiResponse>({ success: false, error: "Invalid credentials" }, 401);
        }

        rateLimitsService.resetOnSuccess(ip);

        const session = sessionsService.create(config.session.maxAge);
        createSessionCookie(c, session.token, config);

        return c.json<ApiResponse>({ success: true, data: { message: "Logged in successfully" } });
    })

    .post("/api/logout", (c) => {
        const sessionToken = c.get("session")?.token;

        if (sessionToken) {
            sessionsService.delete(sessionToken);
        }

        clearSessionCookie(c);

        return c.json<ApiResponse>({ success: true, data: { message: "Logged out successfully" } });
    })

    .get("/api/me", async (c) => {
        if (config.auth.disabled) {
            return c.json<ApiResponse>({
                success: true,
                data: { authenticated: true },
            });
        }

        const sessionToken = getCookie(c, "session");
        if (!sessionToken) {
            return c.json<ApiResponse>({
                success: true,
                data: { authenticated: false },
            });
        }

        const valid = sessionsService.isValid(sessionToken);
        return c.json<ApiResponse>({
            success: true,
            data: { authenticated: valid },
        });
    })

    .route("/", wsApp)
    .route("/api/v1", createApiRoutes(listsService, sectionsService, itemsService, sessionsService, importExportService, config))

    .notFound(notFoundHandler);

function createApiRoutes(
    listsService: ReturnType<typeof createListsService>,
    sectionsService: ReturnType<typeof createSectionsService>,
    itemsService: ReturnType<typeof createItemsService>,
    sessionsService: ReturnType<typeof createSessionsService>,
    importExportService: ReturnType<typeof createImportExportService>,
    config: ReturnType<typeof getConfig>
) {
    return new Hono<{ Variables: AppVariables }>()
        .use("*", requireAuth(sessionsService, config))

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
            try {
                const list = listsService.create(body.name, body.icon);
                broadcastListCreated(list);
                return c.json<ApiResponse>({ success: true, data: list }, 201);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create list";
                const status = message.includes("already exists") ? 409 : 500;
                return c.json<ApiResponse>({ success: false, error: message }, status);
            }
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
            broadcastListUpdated(list);
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
            broadcastListUpdated(list);
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
            broadcastSectionCreated(section);
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
            broadcastSectionUpdated(section);
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
            broadcastSectionDeleted(id);
            return c.json<ApiResponse>({ success: true });
        })

        .post("/sections/reorder", async (c) => {
            const body = await c.req.json<{ ids: number[] }>();
            sectionsService.reorder(body.ids);
            broadcastSectionReordered(body.ids);
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
            broadcastItemCreated(item);
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
            broadcastItemUpdated(item);
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
            broadcastItemDeleted(id);
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
            broadcastItemMoved(item);
            return c.json<ApiResponse>({ success: true, data: item });
        })

        .post("/items/reorder", async (c) => {
            const body = await c.req.json<{ ids: number[] }>();
            itemsService.reorder(body.ids);
            return c.json<ApiResponse>({ success: true });
        })

        .get("/history", (c) => {
            const query = c.req.query("q") || "";
            const limit = parseInt(c.req.query("limit") || "100", 10);
            if (query.length >= 2) {
                const results = itemsService.searchHistory(query, limit);
                return c.json<ApiResponse>({ success: true, data: results });
            }
            const history = itemsService.getHistory(limit);
            return c.json<ApiResponse>({ success: true, data: history });
        })

        .delete("/history/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid history ID" }, 400);
            }
            const deleted = itemsService.deleteHistoryEntry(id);
            if (!deleted) {
                return c.json<ApiResponse>({ success: false, error: "History entry not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true });
        })

        .get("/suggestions", (c) => {
            const query = c.req.query("q") || "";
            const limit = parseInt(c.req.query("limit") || "5", 10);
            const results = itemsService.searchHistory(query, limit);
            return c.json<ApiResponse>({ success: true, data: results });
        })

        .get("/history/search", (c) => {
            const query = c.req.query("q") || "";
            const limit = parseInt(c.req.query("limit") || "5", 10);
            const results = itemsService.searchHistory(query, limit);
            return c.json<ApiResponse>({ success: true, data: results });
        })

        // Template routes
        .get("/templates", (c) => {
            const templates = templatesService.getAllWithItems();
            return c.json<ApiResponse>({ success: true, data: templates });
        })

        .post("/templates", async (c) => {
            const body = await c.req.json<{ name: string }>();
            if (!body.name?.trim() || body.name.length > 100) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-100 characters" }, 400);
            }
            const template = templatesService.create(body.name.trim());
            return c.json<ApiResponse>({ success: true, data: template }, 201);
        })

        .get("/templates/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const template = templatesService.getByIdWithItems(id);
            if (!template) {
                return c.json<ApiResponse>({ success: false, error: "Template not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: template });
        })

        .put("/templates/:id", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const body = await c.req.json<{ name: string }>();
            if (!body.name?.trim() || body.name.length > 100) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-100 characters" }, 400);
            }
            const template = templatesService.update(id, body.name.trim());
            if (!template) {
                return c.json<ApiResponse>({ success: false, error: "Template not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: template });
        })

        .delete("/templates/:id", (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const deleted = templatesService.delete(id);
            if (!deleted) {
                return c.json<ApiResponse>({ success: false, error: "Template not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true });
        })

        .post("/templates/:id/items", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const body = await c.req.json<{ name: string; description?: string; quantity?: string; sectionName?: string }>();
            if (!body.name?.trim() || body.name.length > 200) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-200 characters" }, 400);
            }
            const template = templatesService.getById(id);
            if (!template) {
                return c.json<ApiResponse>({ success: false, error: "Template not found" }, 404);
            }
            const item = templatesService.addItem(id, body.name.trim(), {
                description: body.description,
                quantity: body.quantity,
                sectionName: body.sectionName,
            });
            return c.json<ApiResponse>({ success: true, data: item }, 201);
        })

        .put("/templates/:templateId/items/:itemId", async (c) => {
            const templateId = parseId(c.req.param("templateId"));
            const itemId = parseId(c.req.param("itemId"));
            if (templateId === null || itemId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid ID" }, 400);
            }
            const body = await c.req.json<{ name?: string; description?: string | null; quantity?: string | null; sectionName?: string | null }>();
            const item = templatesService.updateItem(itemId, body);
            if (!item) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true, data: item });
        })

        .delete("/templates/:templateId/items/:itemId", (c) => {
            const templateId = parseId(c.req.param("templateId"));
            const itemId = parseId(c.req.param("itemId"));
            if (templateId === null || itemId === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid ID" }, 400);
            }
            const deleted = templatesService.deleteItem(itemId);
            if (!deleted) {
                return c.json<ApiResponse>({ success: false, error: "Item not found" }, 404);
            }
            return c.json<ApiResponse>({ success: true });
        })

        .post("/templates/:id/reorder", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const body = await c.req.json<{ ids: number[] }>();
            templatesService.reorderItems(id, body.ids);
            return c.json<ApiResponse>({ success: true });
        })

        .post("/templates/:id/apply", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid template ID" }, 400);
            }
            const body = await c.req.json<{ listId: number; itemIds?: number[] }>();
            if (!body.listId) {
                return c.json<ApiResponse>({ success: false, error: "List ID is required" }, 400);
            }

            const list = listsService.getById(body.listId);
            if (!list) {
                return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
            }

            const sections = sectionsService.getByListIdWithItems(body.listId);

            const result = templatesService.applyToList(
                id,
                sections,
                (name) => sectionsService.create(body.listId, name),
                (sectionId, name, description, quantity) => itemsService.create(sectionId, name, description, quantity),
                body.itemIds
            );

            return c.json<ApiResponse>({ success: true, data: result });
        })

        .post("/lists/:id/template", async (c) => {
            const id = parseId(c.req.param("id"));
            if (id === null) {
                return c.json<ApiResponse>({ success: false, error: "Invalid list ID" }, 400);
            }
            const body = await c.req.json<{ name: string; sectionIds?: number[] }>();
            if (!body.name?.trim() || body.name.length > 100) {
                return c.json<ApiResponse>({ success: false, error: "Name must be 1-100 characters" }, 400);
            }

            const list = listsService.getById(id);
            if (!list) {
                return c.json<ApiResponse>({ success: false, error: "List not found" }, 404);
            }

            let sections = sectionsService.getByListIdWithItems(id);
            if (body.sectionIds) {
                sections = sections.filter((s) => body.sectionIds!.includes(s.id));
            }

            const template = templatesService.createFromSections(body.name.trim(), sections);
            return c.json<ApiResponse>({ success: true, data: template }, 201);
        })

        .get("/export/summary", (c) => {
            const summary = importExportService.getExportSummary();
            return c.json<ApiResponse>({ success: true, data: summary });
        })

        .post("/export", async (c) => {
            let body: { listIds?: number[]; templateIds?: number[]; includeHistory?: boolean };
            try {
                body = await c.req.json();
            } catch {
                body = {};
            }

            const options = {
                listIds: body.listIds,
                templateIds: body.templateIds,
                includeHistory: body.includeHistory !== false,
            };

            const data = importExportService.exportData(options);
            return c.json<ApiResponse>({ success: true, data });
        })

        .post("/import/preview", async (c) => {
            let body: unknown;
            try {
                const text = await c.req.text();
                if (text.length > importExportService.getMaxImportSize()) {
                    return c.json<ApiResponse>({ success: false, error: "File too large. Maximum size is 10 MB." }, 400);
                }
                body = JSON.parse(text);
            } catch {
                return c.json<ApiResponse>({ success: false, error: "Invalid JSON format" }, 400);
            }

            const validation = validateImportData(body);
            if (!validation.valid) {
                return c.json<ApiResponse>({ success: false, error: "Validation failed", data: { errors: validation.errors } }, 400);
            }

            const preview = importExportService.preview(body as ExportData);
            return c.json<ApiResponse>({ success: true, data: preview });
        })

        .post("/import", async (c) => {
            let rawBody: unknown;
            try {
                const text = await c.req.text();
                if (text.length > importExportService.getMaxImportSize()) {
                    return c.json<ApiResponse>({ success: false, error: "File too large. Maximum size is 10 MB." }, 400);
                }
                rawBody = JSON.parse(text);
            } catch {
                return c.json<ApiResponse>({ success: false, error: "Invalid JSON format" }, 400);
            }

            const outerBody = rawBody as { data?: unknown; options?: ImportOptions };
            const importData = outerBody.data;
            const options = outerBody.options;

            if (!importData || !options) {
                return c.json<ApiResponse>({ success: false, error: "Request must include 'data' and 'options' fields" }, 400);
            }

            if (options.mode !== "merge" && options.mode !== "replace") {
                return c.json<ApiResponse>({ success: false, error: "Import mode must be 'merge' or 'replace'" }, 400);
            }

            const validation = validateImportData(importData);
            if (!validation.valid) {
                return c.json<ApiResponse>({ success: false, error: "Validation failed", data: { errors: validation.errors } }, 400);
            }

            try {
                const result = importExportService.importData(importData as ExportData, options);
                return c.json<ApiResponse>({ success: true, data: result });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Import failed";
                return c.json<ApiResponse>({ success: false, error: message }, 500);
            }
        });
}

export { db, closeDatabase };
export default app;
