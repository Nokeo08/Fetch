import { describe, test, expect, beforeAll } from "bun:test";

beforeAll(() => {
    process.env.DISABLE_AUTH = "true";
});

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

            const data = (await res.json()) as { success: boolean; data: { name: string } };
            expect(data.success).toBe(true);
            expect(data.data.name).toBe("Test List");
        });

        test("validates name length", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "" }),
            });
            expect(res.status).toBe(400);

            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(false);
        });
    });
});
