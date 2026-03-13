import { describe, test, expect } from "bun:test";
import app from "../index";
import type { ShoppingList, Section, Item, ApiResponse } from "shared/dist";

type ApiJson<T = unknown> = { success: boolean; data: T; error?: string };

describe("API Comprehensive Tests", () => {
    describe("Status Codes", () => {
        test("GET /health returns 200", async () => {
            const res = await app.request("/health");
            expect(res.status).toBe(200);
        });

        test("POST /api/v1/lists returns 201 on success", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Status Code Test" }),
            });
            expect(res.status).toBe(201);
        });

        test("GET /api/v1/lists/:id returns 404 for non-existent list", async () => {
            const res = await app.request("/api/v1/lists/99999");
            expect(res.status).toBe(404);
        });

        test("GET /api/v1/lists/:id returns 400 for invalid ID", async () => {
            const res = await app.request("/api/v1/lists/abc");
            expect(res.status).toBe(400);
        });

        test("DELETE /api/v1/lists/:id returns 404 for non-existent", async () => {
            const res = await app.request("/api/v1/lists/99999", { method: "DELETE" });
            expect(res.status).toBe(404);
        });

        test("GET /api/v1/items/:id returns 404 for non-existent", async () => {
            const res = await app.request("/api/v1/items/99999");
            expect(res.status).toBe(404);
        });

        test("GET /api/v1/sections/:id returns 404 for non-existent", async () => {
            const res = await app.request("/api/v1/sections/99999");
            expect(res.status).toBe(404);
        });

        test("GET /api/v1/templates/:id returns 404 for non-existent", async () => {
            const res = await app.request("/api/v1/templates/99999");
            expect(res.status).toBe(404);
        });

        test("DELETE /api/v1/items/:id returns 404 for non-existent", async () => {
            const res = await app.request("/api/v1/items/99999", { method: "DELETE" });
            expect(res.status).toBe(404);
        });
    });

    describe("Request Validation", () => {
        test("POST /api/v1/lists rejects empty name", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);
        });

        test("POST /api/v1/lists rejects name over 100 chars", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "a".repeat(101) }),
            });
            expect(res.status).toBe(400);
        });

        test("POST sections rejects empty name", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Validation Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;

            const res = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);
        });

        test("POST items rejects empty name", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item Validation" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const secRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const secData = (await secRes.json()) as ApiJson<Section>;

            const res = await app.request(`/api/v1/sections/${secData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);
        });

        test("POST items rejects name over 200 chars", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item Long Name" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const secRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const secData = (await secRes.json()) as ApiJson<Section>;

            const res = await app.request(`/api/v1/sections/${secData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "x".repeat(201) }),
            });
            expect(res.status).toBe(400);
        });

        test("PUT items rejects invalid status", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Status Validation" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const secRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const secData = (await secRes.json()) as ApiJson<Section>;
            const itemRes = await app.request(`/api/v1/sections/${secData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item" }),
            });
            const itemData = (await itemRes.json()) as ApiJson<Item>;

            const res = await app.request(`/api/v1/items/${itemData.data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "invalid" }),
            });
            expect(res.status).toBe(400);
        });

        test("negative and zero IDs return 400", async () => {
            const res1 = await app.request("/api/v1/lists/0");
            expect(res1.status).toBe(400);

            const res2 = await app.request("/api/v1/lists/-1");
            expect(res2.status).toBe(400);
        });

        test("POST templates rejects empty name", async () => {
            const res = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);
        });

        test("POST templates rejects name over 100 chars", async () => {
            const res = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "a".repeat(101) }),
            });
            expect(res.status).toBe(400);
        });
    });

    describe("Response Format", () => {
        test("all successful responses have success: true", async () => {
            const res = await app.request("/api/v1/lists");
            const data = (await res.json()) as ApiJson;
            expect(data.success).toBe(true);
        });

        test("all error responses have success: false and error message", async () => {
            const res = await app.request("/api/v1/lists/abc");
            const data = (await res.json()) as ApiJson;
            expect(data.success).toBe(false);
            expect(data.error).toBeDefined();
            expect(typeof data.error).toBe("string");
        });

        test("list response has correct shape", async () => {
            const createRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Shape Test" }),
            });
            const createData = (await createRes.json()) as ApiJson<ShoppingList>;
            const list = createData.data;

            expect(list).toHaveProperty("id");
            expect(list).toHaveProperty("name");
            expect(list).toHaveProperty("icon");
            expect(list).toHaveProperty("sortOrder");
            expect(list).toHaveProperty("isActive");
            expect(list).toHaveProperty("createdAt");
        });

        test("item response has correct shape", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item Shape Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const secRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const secData = (await secRes.json()) as ApiJson<Section>;
            const itemRes = await app.request(`/api/v1/sections/${secData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item" }),
            });
            const itemData = (await itemRes.json()) as ApiJson<Item>;
            const item = itemData.data;

            expect(item).toHaveProperty("id");
            expect(item).toHaveProperty("sectionId");
            expect(item).toHaveProperty("name");
            expect(item).toHaveProperty("status");
            expect(item).toHaveProperty("sortOrder");
            expect(item).toHaveProperty("createdAt");
            expect(item).toHaveProperty("updatedAt");
        });

        test("health endpoint returns expected structure", async () => {
            const res = await app.request("/health");
            const data = (await res.json()) as {
                status: string;
                timestamp: string;
                database: { status: string; latency?: number };
            };
            expect(data.status).toBe("healthy");
            expect(data.timestamp).toBeDefined();
            expect(data.database.status).toBe("connected");
            expect(typeof data.database.latency).toBe("number");
        });
    });

    describe("Error Handling", () => {
        test("404 for unknown API routes", async () => {
            const res = await app.request("/api/v1/nonexistent");
            expect(res.status).toBe(404);
        });

        test("duplicate list name returns 409", async () => {
            await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Duplicate Test" }),
            });

            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Duplicate Test" }),
            });
            expect(res.status).toBe(409);
        });

        test("import with missing required fields returns 400", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            expect(res.status).toBe(400);
        });

        test("import with invalid mode returns 400", async () => {
            const res = await app.request("/api/v1/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: { version: "1.0.0", exported_at: new Date().toISOString(), lists: [] },
                    options: { mode: "invalid" },
                }),
            });
            expect(res.status).toBe(400);
        });
    });

    describe("History and Search API", () => {
        test("GET /api/v1/history returns history entries", async () => {
            const res = await app.request("/api/v1/history");
            expect(res.status).toBe(200);
            const data = (await res.json()) as ApiJson<unknown[]>;
            expect(Array.isArray(data.data)).toBe(true);
        });

        test("GET /api/v1/history?q=milk performs search when query >= 2 chars", async () => {
            const res = await app.request("/api/v1/history?q=mi");
            expect(res.status).toBe(200);
        });

        test("GET /api/v1/suggestions returns results", async () => {
            const res = await app.request("/api/v1/suggestions?q=test");
            expect(res.status).toBe(200);
            const data = (await res.json()) as ApiJson<unknown[]>;
            expect(Array.isArray(data.data)).toBe(true);
        });

        test("DELETE /api/v1/history/:id with invalid ID returns 400", async () => {
            const res = await app.request("/api/v1/history/abc", { method: "DELETE" });
            expect(res.status).toBe(400);
        });

        test("DELETE /api/v1/history/:id with non-existent returns 404", async () => {
            const res = await app.request("/api/v1/history/99999", { method: "DELETE" });
            expect(res.status).toBe(404);
        });
    });

    describe("Template API", () => {
        test("GET /api/v1/templates returns array", async () => {
            const res = await app.request("/api/v1/templates");
            expect(res.status).toBe(200);
            const data = (await res.json()) as ApiJson<unknown[]>;
            expect(Array.isArray(data.data)).toBe(true);
        });

        test("template CRUD lifecycle", async () => {
            const createRes = await app.request("/api/v1/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "API CRUD Template" }),
            });
            expect(createRes.status).toBe(201);
            const created = (await createRes.json()) as ApiJson<{ id: number; name: string }>;
            const templateId = created.data.id;

            const getRes = await app.request(`/api/v1/templates/${templateId}`);
            expect(getRes.status).toBe(200);

            const updateRes = await app.request(`/api/v1/templates/${templateId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Updated Template" }),
            });
            expect(updateRes.status).toBe(200);
            const updated = (await updateRes.json()) as ApiJson<{ name: string }>;
            expect(updated.data.name).toBe("Updated Template");

            const deleteRes = await app.request(`/api/v1/templates/${templateId}`, {
                method: "DELETE",
            });
            expect(deleteRes.status).toBe(200);

            const getAfterDelete = await app.request(`/api/v1/templates/${templateId}`);
            expect(getAfterDelete.status).toBe(404);
        });
    });
});
