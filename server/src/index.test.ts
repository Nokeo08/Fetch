process.env.DISABLE_AUTH = "true";
process.env.APP_PASSWORD = "test-password";

import { describe, test, expect } from "bun:test";
import app from "./index";

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
                body: JSON.stringify({ name: "Original Name" }),
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
