import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { CREATE_TABLES, CREATE_INDEXES } from "./db/schema";
import app from "./index";

let db: Database;

beforeAll(() => {
    db = new Database(":memory:");
    db.exec(CREATE_TABLES);
    db.exec(CREATE_INDEXES);
});

afterAll(() => {
    db?.close();
});

describe("HTTP Server", () => {
    describe("Health Endpoint", () => {
        test("GET /health returns 200 with healthy status", async () => {
            const res = await app.request("/health");
            expect(res.status).toBe(200);

            const data = (await res.json()) as { status: string; timestamp: string; database: { status: string } };
            expect(data.status).toBe("healthy");
            expect(data.timestamp).toBeDefined();
            expect(data.database).toBeDefined();
            expect(data.database.status).toBe("connected");
        });
    });

    describe("Root Endpoint", () => {
        test("GET / returns welcome message", async () => {
            const res = await app.request("/");
            expect(res.status).toBe(200);

            const text = await res.text();
            expect(text).toContain("Fetch Shopping List API");
        });
    });

    describe("Hello Endpoint", () => {
        test("GET /hello returns greeting", async () => {
            const res = await app.request("/hello");
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { message: string } };
            expect(data.success).toBe(true);
            expect(data.data.message).toContain("Hello");
        });
    });

    describe("Security Headers", () => {
        test("responses include security headers", async () => {
            const res = await app.request("/health");

            expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
            expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
            expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
            expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
        });

        test("responses include Content-Security-Policy", async () => {
            const res = await app.request("/health");
            const csp = res.headers.get("Content-Security-Policy");
            expect(csp).toBeDefined();
            expect(csp).toContain("default-src");
        });

        test("X-Powered-By header is removed", async () => {
            const res = await app.request("/health");
            expect(res.headers.get("X-Powered-By")).toBeNull();
        });
    });

    describe("Request ID", () => {
        test("responses include X-Request-Id header", async () => {
            const res = await app.request("/health");
            const requestId = res.headers.get("X-Request-Id");
            expect(requestId).toBeDefined();
            expect(requestId?.length).toBeGreaterThan(0);
        });
    });

    describe("404 Handler", () => {
        test("unknown route returns 404", async () => {
            const res = await app.request("/unknown-route");
            expect(res.status).toBe(404);

            const data = (await res.json()) as { success: boolean; error: string; code: string };
            expect(data.success).toBe(false);
            expect(data.error).toContain("not found");
            expect(data.code).toBe("NOT_FOUND");
        });
    });
});

describe("Lists API", () => {
    describe("GET /api/v1/lists", () => {
        test("returns empty array when no lists", async () => {
            const res = await app.request("/api/v1/lists");
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: unknown[] };
            expect(data.success).toBe(true);
            expect(Array.isArray(data.data)).toBe(true);
        });
    });

    describe("POST /api/v1/lists", () => {
        test("creates a list", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test List" }),
            });
            expect(res.status).toBe(201);

            const data = (await res.json()) as { success: boolean; data: { name: string; icon: string } };
            expect(data.success).toBe(true);
            expect(data.data.name).toBe("Test List");
            expect(data.data.icon).toBe("📋");
        });

        test("creates a list with custom icon", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Grocery", icon: "🛒" }),
            });
            expect(res.status).toBe(201);

            const data = (await res.json()) as { success: boolean; data: { name: string; icon: string } };
            expect(data.success).toBe(true);
            expect(data.data.icon).toBe("🛒");
        });

        test("validates name length - empty", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);

            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(false);
        });

        test("validates name length - too long", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "a".repeat(101) }),
            });
            expect(res.status).toBe(400);

            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(false);
        });

        test("rejects duplicate list names (case-insensitive)", async () => {
            await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Groceries" }),
            });

            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "groceries" }),
            });

            expect(res.status).toBe(409);

            const data = (await res.json()) as { success: boolean; error: string };
            expect(data.success).toBe(false);
            expect(data.error).toContain("already exists");
        });
    });

    describe("PUT /api/v1/lists/:id", () => {
        test("updates a list name", async () => {
            const createRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test List for Update Name" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const listId = createData.data.id;

            const res = await app.request(`/api/v1/lists/${listId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Updated Name" }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { name: string } };
            expect(data.success).toBe(true);
            expect(data.data.name).toBe("Updated Name");
        });

        test("updates a list icon", async () => {
            const createRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const listId = createData.data.id;

            const res = await app.request(`/api/v1/lists/${listId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ icon: "🛒" }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { icon: string } };
            expect(data.success).toBe(true);
            expect(data.data.icon).toBe("🛒");
        });

        test("returns 404 for non-existent list", async () => {
            const res = await app.request("/api/v1/lists/99999", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test" }),
            });
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/v1/lists/:id/activate", () => {
        test("sets a list as active", async () => {
            const createRes1 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "List 1" }),
            });
            const createRes2 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "List 2" }),
            });
            const data1 = (await createRes1.json()) as { success: boolean; data: { id: number; isActive: boolean } };
            const data2 = (await createRes2.json()) as { success: boolean; data: { id: number; isActive: boolean } };

            expect(data1.data.isActive).toBe(true);

            const activateRes = await app.request(`/api/v1/lists/${data2.data.id}/activate`, {
                method: "POST",
            });
            expect(activateRes.status).toBe(200);

            const activateData = (await activateRes.json()) as { success: boolean; data: { id: number; isActive: boolean } };
            expect(activateData.data.isActive).toBe(true);

            const allListsRes = await app.request("/api/v1/lists");
            const allListsData = (await allListsRes.json()) as { success: boolean; data: Array<{ id: number; isActive: boolean }> };
            const activeLists = allListsData.data.filter(l => l.isActive);
            expect(activeLists.length).toBe(1);
        });
    });

    describe("DELETE /api/v1/lists/:id", () => {
        test("deletes a list", async () => {
            const createRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "To Delete" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const listId = createData.data.id;

            const createRes2 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Keep This" }),
            });
            expect(createRes2.status).toBe(201);

            const res = await app.request(`/api/v1/lists/${listId}`, {
                method: "DELETE",
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(true);
        });

        test("can delete last remaining list", async () => {
            const listsRes = await app.request("/api/v1/lists");
            const listsData = (await listsRes.json()) as { success: boolean; data: Array<{ id: number }> };

            for (const list of listsData.data) {
                await app.request(`/api/v1/lists/${list.id}`, { method: "DELETE" });
            }

            const remainingListsRes = await app.request("/api/v1/lists");
            const remainingListsData = (await remainingListsRes.json()) as { success: boolean; data: Array<{ id: number }> };
            expect(remainingListsData.data).toHaveLength(0);
        });
    });

    describe("POST /api/v1/lists/reorder", () => {
        test("reorders lists", async () => {
            const list1Res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "List A" }),
            });
            const list2Res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "List B" }),
            });
            const list1Data = (await list1Res.json()) as { success: boolean; data: { id: number } };
            const list2Data = (await list2Res.json()) as { success: boolean; data: { id: number } };

            const res = await app.request("/api/v1/lists/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [list2Data.data.id, list1Data.data.id] }),
            });
            expect(res.status).toBe(200);

            const listsRes = await app.request("/api/v1/lists");
            const listsData = (await listsRes.json()) as { success: boolean; data: Array<{ id: number }> };
            expect(listsData.data[0].id).toBe(list2Data.data.id);
            expect(listsData.data[1].id).toBe(list1Data.data.id);
        });
    });
});

describe("Templates API", () => {
    describe("GET /api/v1/templates", () => {
        test("returns templates with items", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test Template for Get" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const templateId = createData.data.id;

            await app.request(`/api/v1/templates/${templateId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk", quantity: "1 gallon" }),
            });

            const res = await app.request("/api/v1/templates");
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: Array<{ id: number; name: string; items: unknown[] }> };
            expect(data.success).toBe(true);
            const created = data.data.find((t) => t.id === templateId);
            expect(created).toBeDefined();
            expect(created?.name).toBe("Test Template for Get");
            expect(created?.items).toHaveLength(1);
        });
    });

    describe("POST /api/v1/templates", () => {
        test("creates a template", async () => {
            const res = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly Groceries" }),
            });
            expect(res.status).toBe(201);

            const data = (await res.json()) as { success: boolean; data: { id: number; name: string } };
            expect(data.success).toBe(true);
            expect(data.data.name).toBe("Weekly Groceries");
        });

        test("validates name is required", async () => {
            const res = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            expect(res.status).toBe(400);

            const data = (await res.json()) as { success: boolean; error: string };
            expect(data.success).toBe(false);
            expect(data.error).toContain("Name must be");
        });
    });

    describe("GET /api/v1/templates/:id", () => {
        test("returns template with items", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const templateId = createData.data.id;

            await app.request(`/api/v1/templates/${templateId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk" }),
            });

            const res = await app.request(`/api/v1/templates/${templateId}`);
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { id: number; items: unknown[] } };
            expect(data.success).toBe(true);
            expect(data.data.items).toHaveLength(1);
        });

        test("returns 404 for non-existent template", async () => {
            const res = await app.request("/api/v1/templates/999");
            expect(res.status).toBe(404);

            const data = (await res.json()) as { success: boolean; error: string };
            expect(data.success).toBe(false);
            expect(data.error).toBe("Template not found");
        });
    });

    describe("PUT /api/v1/templates/:id", () => {
        test("updates template name", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Original" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const templateId = createData.data.id;

            const res = await app.request(`/api/v1/templates/${templateId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Updated" }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { name: string } };
            expect(data.data.name).toBe("Updated");
        });
    });

    describe("DELETE /api/v1/templates/:id", () => {
        test("deletes template", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "To Delete" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const templateId = createData.data.id;

            const res = await app.request(`/api/v1/templates/${templateId}`, {
                method: "DELETE",
            });
            expect(res.status).toBe(200);

            const getRes = await app.request(`/api/v1/templates/${templateId}`);
            expect(getRes.status).toBe(404);
        });
    });

    describe("POST /api/v1/templates/:id/items", () => {
        test("adds item to template", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly" }),
            });
            const createData = (await createRes.json()) as { success: boolean; data: { id: number } };
            const templateId = createData.data.id;

            const res = await app.request(`/api/v1/templates/${templateId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk", quantity: "1 gallon", sectionName: "Dairy" }),
            });
            expect(res.status).toBe(201);

            const data = (await res.json()) as { success: boolean; data: { name: string; quantity: string; sectionName: string } };
            expect(data.data.name).toBe("Milk");
            expect(data.data.quantity).toBe("1 gallon");
            expect(data.data.sectionName).toBe("Dairy");
        });
    });

    describe("POST /api/v1/templates/:id/apply", () => {
        test("applies template to list", async () => {
            const templateRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly" }),
            });
            const templateData = (await templateRes.json()) as { success: boolean; data: { id: number } };
            const templateId = templateData.data.id;

            await app.request(`/api/v1/templates/${templateId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk" }),
            });

            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Shopping for Apply Test" }),
            });
            const listData = (await listRes.json()) as { success: boolean; data: { id: number } };
            const listId = listData.data.id;

            const res = await app.request(`/api/v1/templates/${templateId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { added: number; skipped: string[] } };
            expect(data.data.added).toBe(1);
            expect(data.data.skipped).toHaveLength(0);
        });

        test("skips duplicate items", async () => {
            const templateRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly" }),
            });
            const templateData = (await templateRes.json()) as { success: boolean; data: { id: number } };
            const templateId = templateData.data.id;

            await app.request(`/api/v1/templates/${templateId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk" }),
            });

            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Shopping for Skip Test" }),
            });
            const listData = (await listRes.json()) as { success: boolean; data: { id: number } };
            const listId = listData.data.id;

            const sectionsRes = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Dairy" }),
            });
            const sectionsData = (await sectionsRes.json()) as { success: boolean; data: { id: number } };
            const sectionId = sectionsData.data.id;

            await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk" }),
            });

            const res = await app.request(`/api/v1/templates/${templateId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { success: boolean; data: { added: number; skipped: string[] } };
            expect(data.data.added).toBe(0);
            expect(data.data.skipped).toEqual(["Milk"]);
        });
    });

    describe("POST /api/v1/lists/:id/template", () => {
        test("creates template from list", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Shopping for Template Create" }),
            });
            const listData = (await listRes.json()) as { success: boolean; data: { id: number } };
            const listId = listData.data.id;

            const sectionsRes = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Dairy" }),
            });
            const sectionsData = (await sectionsRes.json()) as { success: boolean; data: { id: number } };
            const sectionId = sectionsData.data.id;

            await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk", quantity: "1 gallon" }),
            });

            const res = await app.request(`/api/v1/lists/${listId}/template`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Weekly Template" }),
            });
            expect(res.status).toBe(201);

            const data = (await res.json()) as { success: boolean; data: { name: string; items: Array<{ name: string; sectionName: string }> } };
            expect(data.data.name).toBe("Weekly Template");
            expect(data.data.items).toHaveLength(1);
            expect(data.data.items[0]?.name).toBe("Milk");
            expect(data.data.items[0]?.sectionName).toBe("Dairy");
        });
    });
});

describe("History API", () => {
    let testListId: number;
    let testSectionId: number;

    test("setup: create list and section for history tests", async () => {
        const listRes = await app.request("/api/v1/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "History Test List" }),
        });
        const listData = (await listRes.json()) as { data: { id: number } };
        testListId = listData.data.id;

        const sectionRes = await app.request(`/api/v1/lists/${testListId}/sections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "History Section" }),
        });
        const sectionData = (await sectionRes.json()) as { data: { id: number } };
        testSectionId = sectionData.data.id;
    });

    test("GET /api/v1/history returns history entries", async () => {
        await app.request(`/api/v1/sections/${testSectionId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "History Apple", description: "red", quantity: "3" }),
        });
        await app.request(`/api/v1/sections/${testSectionId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "History Banana" }),
        });

        const res = await app.request("/api/v1/history");
        expect(res.status).toBe(200);

        const data = (await res.json()) as {
            success: boolean;
            data: Array<{ id: number; name: string }>;
        };
        expect(data.success).toBe(true);
        expect(data.data.some((h) => h.name === "History Apple")).toBe(true);
        expect(data.data.some((h) => h.name === "History Banana")).toBe(true);
    });

    test("GET /api/v1/history supports limit param", async () => {
        const res = await app.request("/api/v1/history?limit=1");
        expect(res.status).toBe(200);

        const data = (await res.json()) as { data: Array<{ name: string }> };
        expect(data.data.length).toBeLessThanOrEqual(1);
    });

    test("GET /api/v1/history supports q search param", async () => {
        const res = await app.request("/api/v1/history?q=History+Apple");
        expect(res.status).toBe(200);

        const data = (await res.json()) as {
            success: boolean;
            data: Array<{ name: string }>;
        };
        expect(data.success).toBe(true);
        expect(data.data.some((h) => h.name === "History Apple")).toBe(true);
    });

    test("DELETE /api/v1/history/:id deletes a history entry", async () => {
        const historyRes = await app.request("/api/v1/history");
        const historyData = (await historyRes.json()) as {
            data: Array<{ id: number; name: string }>;
        };
        const entry = historyData.data.find((h) => h.name === "History Banana");
        expect(entry).toBeDefined();

        const deleteRes = await app.request(`/api/v1/history/${entry!.id}`, {
            method: "DELETE",
        });
        expect(deleteRes.status).toBe(200);

        const verifyRes = await app.request("/api/v1/history");
        const verifyData = (await verifyRes.json()) as {
            data: Array<{ name: string }>;
        };
        expect(verifyData.data.some((h) => h.name === "History Banana")).toBe(false);
    });

    test("DELETE /api/v1/history/:id returns 404 for non-existent entry", async () => {
        const res = await app.request("/api/v1/history/99999", {
            method: "DELETE",
        });
        expect(res.status).toBe(404);
    });

    test("DELETE /api/v1/history/:id returns 400 for invalid ID", async () => {
        const res = await app.request("/api/v1/history/abc", {
            method: "DELETE",
        });
        expect(res.status).toBe(400);
    });
});

describe("Import/Export API", () => {
    describe("GET /api/v1/export/summary", () => {
        test("returns export summary with correct structure", async () => {
            const res = await app.request("/api/v1/export/summary");
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                success: boolean;
                data: {
                    lists: Array<{ id: number; name: string; icon: string; itemCount: number }>;
                    templates: Array<{ id: number; name: string; itemCount: number }>;
                    historyCount: number;
                };
            };
            expect(data.success).toBe(true);
            expect(Array.isArray(data.data.lists)).toBe(true);
            expect(Array.isArray(data.data.templates)).toBe(true);
            expect(typeof data.data.historyCount).toBe("number");
        });
    });

    describe("POST /api/v1/export", () => {
        test("exports all data with correct structure", async () => {
            const res = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeHistory: true }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                success: boolean;
                data: {
                    version: string;
                    exported_at: string;
                    lists: Array<{ name: string; icon: string; sections: Array<{ name: string; items: unknown[] }> }>;
                    templates: Array<{ name: string; items: unknown[] }>;
                    history: unknown[];
                };
            };
            expect(data.success).toBe(true);
            expect(data.data.version).toBe("1.0.0");
            expect(data.data.exported_at).toBeDefined();
            expect(Array.isArray(data.data.lists)).toBe(true);
            expect(Array.isArray(data.data.templates)).toBe(true);
            expect(Array.isArray(data.data.history)).toBe(true);
        });

        test("exported lists contain sections and items", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Export Test List", icon: "🧪" }),
            });
            const listData = (await listRes.json()) as { data: { id: number } };
            const listId = listData.data.id;

            const sectionRes = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Export Section" }),
            });
            const sectionData = (await sectionRes.json()) as { data: { id: number } };

            await app.request(`/api/v1/sections/${sectionData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Export Item", description: "test desc", quantity: "3" }),
            });

            const res = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listIds: [listId], includeHistory: false }),
            });
            const data = (await res.json()) as {
                data: {
                    lists: Array<{
                        name: string;
                        icon: string;
                        sections: Array<{
                            name: string;
                            items: Array<{ name: string; description: string | null; quantity: string | null; status: string }>;
                        }>;
                    }>;
                };
            };

            expect(data.data.lists).toHaveLength(1);
            const exportedList = data.data.lists[0]!;
            expect(exportedList.name).toBe("Export Test List");
            expect(exportedList.icon).toBe("🧪");
            expect(exportedList.sections).toHaveLength(1);
            expect(exportedList.sections[0]!.name).toBe("Export Section");
            expect(exportedList.sections[0]!.items).toHaveLength(1);
            expect(exportedList.sections[0]!.items[0]!.name).toBe("Export Item");
            expect(exportedList.sections[0]!.items[0]!.description).toBe("test desc");
            expect(exportedList.sections[0]!.items[0]!.quantity).toBe("3");
            expect(exportedList.sections[0]!.items[0]!.status).toBe("active");
        });

        test("exports empty lists when listIds is empty array", async () => {
            const res = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listIds: [], templateIds: [], includeHistory: false }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                data: { lists: unknown[]; templates: unknown[]; history: unknown[] };
            };
            expect(data.data.lists).toHaveLength(0);
            expect(data.data.templates).toHaveLength(0);
            expect(data.data.history).toHaveLength(0);
        });
    });

    describe("POST /api/v1/import/preview", () => {
        test("returns preview of valid import data", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [
                    { name: "Preview List", icon: "📋", sections: [{ name: "Section 1", items: [{ name: "Item 1", description: null, quantity: null, status: "active" }] }] },
                ],
                templates: [
                    { name: "Preview Template", items: [{ name: "T-Item", description: null, quantity: null, sectionName: null }] },
                ],
                history: [
                    { name: "History Item", sectionName: null, description: null, quantity: null, frequency: 3 },
                ],
            };

            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(importData),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                success: boolean;
                data: {
                    listCount: number;
                    templateCount: number;
                    historyCount: number;
                    existingListConflicts: string[];
                    existingTemplateConflicts: string[];
                };
            };
            expect(data.success).toBe(true);
            expect(data.data.listCount).toBe(1);
            expect(data.data.templateCount).toBe(1);
            expect(data.data.historyCount).toBe(1);
        });

        test("rejects invalid JSON format", async () => {
            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "not json",
            });
            expect(res.status).toBe(400);
        });

        test("rejects data with missing required fields", async () => {
            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ version: "1.0.0" }),
            });
            expect(res.status).toBe(400);

            const data = (await res.json()) as { success: boolean; error: string };
            expect(data.success).toBe(false);
        });

        test("rejects unsupported version", async () => {
            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: "99.0.0",
                    exported_at: new Date().toISOString(),
                    lists: [],
                }),
            });
            expect(res.status).toBe(400);
        });

        test("detects conflicts with existing lists", async () => {
            await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Conflict Test List" }),
            });

            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [{ name: "Conflict Test List", icon: "📋", sections: [] }],
                templates: [],
                history: [],
            };

            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(importData),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                data: { existingListConflicts: string[] };
            };
            expect(data.data.existingListConflicts.length).toBeGreaterThan(0);
            expect(data.data.existingListConflicts).toContain("Conflict Test List");
        });
    });

    describe("POST /api/v1/import", () => {
        test("imports data in merge mode", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [
                    {
                        name: "Imported Merge List",
                        icon: "🆕",
                        sections: [
                            {
                                name: "Imported Section",
                                items: [
                                    { name: "Imported Item 1", description: "desc1", quantity: "2", status: "active" },
                                    { name: "Imported Item 2", description: null, quantity: null, status: "completed" },
                                ],
                            },
                        ],
                    },
                ],
                templates: [
                    {
                        name: "Imported Template",
                        items: [{ name: "Template Item 1", description: null, quantity: "1 box", sectionName: "Snacks" }],
                    },
                ],
                history: [
                    { name: "Imported History", sectionName: "Produce", description: "fresh", quantity: "1 bunch", frequency: 5 },
                ],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "merge", importLists: true, importTemplates: true, importHistory: true },
                }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                success: boolean;
                data: { listsImported: number; templatesImported: number; historyImported: number; skipped: string[] };
            };
            expect(data.success).toBe(true);
            expect(data.data.listsImported).toBe(1);
            expect(data.data.templatesImported).toBe(1);
            expect(data.data.historyImported).toBe(1);

            const verifyRes = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeHistory: true }),
            });
            const exportData = (await verifyRes.json()) as {
                data: {
                    lists: Array<{ name: string; sections: Array<{ name: string; items: Array<{ name: string }> }> }>;
                    templates: Array<{ name: string; items: Array<{ name: string }> }>;
                };
            };
            const importedList = exportData.data.lists.find((l) => l.name === "Imported Merge List");
            expect(importedList).toBeDefined();
            expect(importedList!.sections).toHaveLength(1);
            expect(importedList!.sections[0]!.items).toHaveLength(2);
        });

        test("merges new items into existing list in merge mode", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Imported Merge List",
                    icon: "📋",
                    sections: [
                        {
                            name: "Imported Section",
                            items: [
                                { name: "Imported Item 1", description: "desc1", quantity: "2", status: "active" },
                                { name: "Merged New Item", description: "new", quantity: "3", status: "active" },
                            ],
                        },
                        {
                            name: "Brand New Section",
                            items: [
                                { name: "Section Item", description: null, quantity: null, status: "active" },
                            ],
                        },
                    ],
                }],
                templates: [],
                history: [],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "merge", importLists: true, importTemplates: false, importHistory: false },
                }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                data: { listsImported: number; listsMerged: number; skipped: string[] };
            };
            expect(data.data.listsImported).toBe(0);
            expect(data.data.listsMerged).toBe(1);
            expect(data.data.skipped.some((s: string) => s.includes("Imported Item 1") && s.includes("already exists"))).toBe(true);

            const verifyRes = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeHistory: true }),
            });
            const exportData = (await verifyRes.json()) as {
                data: {
                    lists: Array<{ name: string; sections: Array<{ name: string; items: Array<{ name: string }> }> }>;
                };
            };
            const mergedList = exportData.data.lists.find((l) => l.name === "Imported Merge List");
            expect(mergedList).toBeDefined();
            expect(mergedList!.sections).toHaveLength(2);

            const existingSection = mergedList!.sections.find((s) => s.name === "Imported Section");
            expect(existingSection).toBeDefined();
            expect(existingSection!.items).toHaveLength(3);
            expect(existingSection!.items.some((i) => i.name === "Merged New Item")).toBe(true);

            const newSection = mergedList!.sections.find((s) => s.name === "Brand New Section");
            expect(newSection).toBeDefined();
            expect(newSection!.items).toHaveLength(1);
            expect(newSection!.items[0]!.name).toBe("Section Item");
        });

        test("imports data in replace mode", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [
                    {
                        name: "Replaced List",
                        icon: "🔄",
                        sections: [{ name: "New Section", items: [{ name: "New Item", description: null, quantity: null, status: "active" }] }],
                    },
                ],
                templates: [],
                history: [],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "replace", importLists: true, importTemplates: true, importHistory: true },
                }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                data: { listsImported: number };
            };
            expect(data.data.listsImported).toBe(1);

            const verifyRes = await app.request("/api/v1/lists");
            const listsData = (await verifyRes.json()) as { data: Array<{ name: string }> };
            expect(listsData.data).toHaveLength(1);
            expect(listsData.data[0]!.name).toBe("Replaced List");
        });

        test("selectively imports only templates", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [{ name: "Should Not Import", icon: "📋", sections: [] }],
                templates: [{ name: "Selective Template", items: [] }],
                history: [],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "merge", importLists: false, importTemplates: true, importHistory: false },
                }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as {
                data: { listsImported: number; templatesImported: number };
            };
            expect(data.data.listsImported).toBe(0);
            expect(data.data.templatesImported).toBe(1);
        });

        test("rejects invalid import mode", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: { version: "1.0.0", exported_at: new Date().toISOString(), lists: [] },
                    options: { mode: "invalid", importLists: true, importTemplates: true, importHistory: true },
                }),
            });
            expect(res.status).toBe(400);
        });

        test("rejects request without data and options", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            expect(res.status).toBe(400);
        });

        test("rejects invalid JSON", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "not valid json",
            });
            expect(res.status).toBe(400);
        });

        test("validates import data structure", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: { version: "1.0.0", exported_at: new Date().toISOString() },
                    options: { mode: "merge", importLists: true, importTemplates: true, importHistory: true },
                }),
            });
            expect(res.status).toBe(400);
        });

        test("handles items with missing optional fields", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [
                    {
                        name: "Minimal List",
                        icon: "📋",
                        sections: [
                            {
                                name: "Minimal Section",
                                items: [{ name: "Minimal Item", description: null, quantity: null, status: "active" }],
                            },
                        ],
                    },
                ],
                templates: [],
                history: [],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "merge", importLists: true, importTemplates: false, importHistory: false },
                }),
            });
            expect(res.status).toBe(200);

            const data = (await res.json()) as { data: { listsImported: number } };
            expect(data.data.listsImported).toBe(1);
        });

        test("sanitizes import data strings", async () => {
            const importData = {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [
                    {
                        name: "  Trimmed Name  ",
                        icon: "📋",
                        sections: [
                            {
                                name: "  Trimmed Section  ",
                                items: [{ name: "  Trimmed Item  ", description: null, quantity: null, status: "active" }],
                            },
                        ],
                    },
                ],
                templates: [],
                history: [],
            };

            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: importData,
                    options: { mode: "merge", importLists: true, importTemplates: false, importHistory: false },
                }),
            });
            expect(res.status).toBe(200);

            const verifyRes = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeHistory: true }),
            });
            const exportData = (await verifyRes.json()) as {
                data: { lists: Array<{ name: string; sections: Array<{ name: string; items: Array<{ name: string }> }> }> };
            };
            const trimmedList = exportData.data.lists.find((l) => l.name === "Trimmed Name");
            expect(trimmedList).toBeDefined();
            expect(trimmedList!.sections[0]!.name).toBe("Trimmed Section");
            expect(trimmedList!.sections[0]!.items[0]!.name).toBe("Trimmed Item");
        });
    });
});
