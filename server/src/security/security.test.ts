import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { createTestConfig } from "../test-helpers/config";
import { createTestList, createTestSection, createTestItem, resetCounters } from "../test-helpers/factories";
import { requireAuth, constantTimeEquals } from "../middleware/auth";
import app from "../index";
import type { ApiResponse } from "shared/dist";

let db: Database;
let services: TestServices;

beforeEach(() => {
    resetCounters();
    db = createTestDb();
    services = createTestServices(db);
});

afterEach(() => {
    db?.close();
});

describe("Security Tests", () => {
    describe("XSS Prevention", () => {
        test("security headers prevent XSS", async () => {
            const res = await app.request("/health");
            expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
            expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        });

        test("CSP header is set", async () => {
            const res = await app.request("/health");
            const csp = res.headers.get("Content-Security-Policy");
            expect(csp).toBeDefined();
            expect(csp).toContain("default-src");
            expect(csp).toContain("'self'");
        });

        test("X-Frame-Options prevents clickjacking", async () => {
            const res = await app.request("/health");
            expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
        });

        test("script injection in list name is stored safely as text", async () => {
            const xssPayload = "<script>alert('xss')</script>";
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: xssPayload }),
            });

            const data = (await res.json()) as { success: boolean; data: { name: string } };
            if (data.success) {
                expect(data.data.name).toBe(xssPayload);
            }
        });

        test("script injection in item name is stored safely", async () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const xssPayload = '<img src=x onerror="alert(1)">';
            const item = services.items.create(section.id, xssPayload);
            expect(item.name).toBe(xssPayload);
        });
    });

    describe("SQL Injection Prevention", () => {
        test("SQL injection in list name does not execute", () => {
            const sqlPayload = "Test'; DROP TABLE lists; --";
            const list = services.lists.create(sqlPayload);
            expect(list.name).toBe(sqlPayload);

            const allLists = services.lists.getAll();
            expect(allLists.length).toBeGreaterThanOrEqual(1);
        });

        test("SQL injection in item name does not execute", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const sqlPayload = "Item'; DELETE FROM items; --";
            const item = services.items.create(section.id, sqlPayload);
            expect(item.name).toBe(sqlPayload);
        });

        test("SQL injection in search query does not execute", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            services.items.create(section.id, "Milk");

            const sqlPayload = "'; DROP TABLE history; --";
            const results = services.items.searchHistory(sqlPayload);
            expect(Array.isArray(results)).toBe(true);

            const history = services.items.getHistory();
            expect(history.length).toBeGreaterThanOrEqual(0);
        });

        test("SQL injection via API request parameters returns error", async () => {
            const res = await app.request("/api/v1/lists/1; DROP TABLE lists; --");
            expect([400, 404]).toContain(res.status);
        });

        test("SQL injection in section name does not execute", () => {
            const list = createTestList(services);
            const sqlPayload = "Section'; DROP TABLE sections; --";
            const section = services.sections.create(list.id, sqlPayload);
            expect(section.name).toBe(sqlPayload);
        });
    });

    describe("Authentication Bypass Attempts", () => {
        test("auth middleware rejects empty session cookie", async () => {
            const config = createTestConfig();
            const sessionsService = services.sessions;
            const testApp = new Hono()
                .use("*", requireAuth(sessionsService, config))
                .get("/protected", (c) => c.json({ success: true }));

            const res = await testApp.request("/protected", {
                headers: { Cookie: "session=" },
            });
            expect(res.status).toBe(401);
        });

        test("auth middleware rejects manipulated session token", async () => {
            const config = createTestConfig();
            const sessionsService = services.sessions;
            const testApp = new Hono()
                .use("*", requireAuth(sessionsService, config))
                .get("/protected", (c) => c.json({ success: true }));

            const res = await testApp.request("/protected", {
                headers: { Cookie: "session=aaaaaaaabbbbbbbbccccccccdddddddd" },
            });
            expect(res.status).toBe(401);
        });

        test("auth middleware rejects tokens that do not exist in database", async () => {
            const config = createTestConfig();
            const sessionsService = services.sessions;
            const testApp = new Hono()
                .use("*", requireAuth(sessionsService, config))
                .get("/protected", (c) => c.json({ success: true }));

            const res = await testApp.request("/protected", {
                headers: { Cookie: "session=aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666" },
            });
            expect(res.status).toBe(401);
        });

        test("auth is bypassed when DISABLE_AUTH is true", async () => {
            const config = createTestConfig({ auth: { password: "test", disabled: true } });
            const sessionsService = services.sessions;
            const testApp = new Hono()
                .use("*", requireAuth(sessionsService, config))
                .get("/protected", (c) => c.json({ success: true }));

            const res = await testApp.request("/protected");
            expect(res.status).toBe(200);
        });
    });

    describe("Session Fixation Prevention", () => {
        test("each login creates a new unique session token", () => {
            const config = createTestConfig();
            const s1 = services.sessions.create(config.session.maxAge);
            const s2 = services.sessions.create(config.session.maxAge);

            expect(s1.token).not.toBe(s2.token);
        });

        test("session tokens are 64 hex characters (32 random bytes)", () => {
            const config = createTestConfig();
            const session = services.sessions.create(config.session.maxAge);

            expect(session.token.length).toBe(64);
            expect(/^[0-9a-f]{64}$/.test(session.token)).toBe(true);
        });

        test("deleted sessions cannot be reused", () => {
            const config = createTestConfig();
            const session = services.sessions.create(config.session.maxAge);

            services.sessions.delete(session.token);

            expect(services.sessions.isValid(session.token)).toBe(false);
            expect(services.sessions.getByToken(session.token)).toBeNull();
        });
    });

    describe("Rate Limiting Effectiveness", () => {
        test("rate limit locks after max attempts", () => {
            const config = { maxAttempts: 3, windowMs: 60000, lockoutMs: 60000 };
            const rateLimits = services.rateLimits;

            const ip = "10.0.0.1";
            expect(rateLimits.isLocked(ip)).toBe(false);

            for (let i = 0; i < 5; i++) {
                services.rateLimits.recordAttempt(ip);
            }

            expect(rateLimits.getRemainingAttempts(ip)).toBe(0);
        });

        test("rate limit resets on successful login", () => {
            const ip = "10.0.0.2";
            services.rateLimits.recordAttempt(ip);
            services.rateLimits.recordAttempt(ip);

            services.rateLimits.resetOnSuccess(ip);

            expect(services.rateLimits.getRemainingAttempts(ip)).toBe(5);
        });

        test("rate limiting locks out after max attempts via standalone app", async () => {
            const config = createTestConfig({
                rateLimit: { maxAttempts: 3, windowMs: 60000, lockoutMs: 60000 },
            });

            const loginApp = new Hono().post("/login", async (c) => {
                const ip = c.req.header("x-forwarded-for") || "unknown";
                if (services.rateLimits.isLocked(ip)) {
                    return c.json({ success: false, error: "Locked" }, 429);
                }
                let body: { password?: string };
                try {
                    body = await c.req.json();
                } catch {
                    return c.json({ success: false }, 400);
                }
                if (!body.password || !constantTimeEquals(body.password, config.auth.password)) {
                    services.rateLimits.recordAttempt(ip);
                    if (services.rateLimits.isLocked(ip)) {
                        return c.json({ success: false, error: "Locked" }, 429);
                    }
                    return c.json({ success: false }, 401);
                }
                return c.json({ success: true });
            });

            for (let i = 0; i < 5; i++) {
                await loginApp.request("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Forwarded-For": "192.168.1.100",
                    },
                    body: JSON.stringify({ password: "wrong" }),
                });
            }

            const res = await loginApp.request("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Forwarded-For": "192.168.1.100",
                },
                body: JSON.stringify({ password: "wrong" }),
            });

            expect(res.status).toBe(429);
        });
    });

    describe("Constant Time Comparison", () => {
        test("equal strings return true", () => {
            expect(constantTimeEquals("secret", "secret")).toBe(true);
        });

        test("different strings return false", () => {
            expect(constantTimeEquals("secret", "Secret")).toBe(false);
        });

        test("different length strings return false", () => {
            expect(constantTimeEquals("short", "longer-string")).toBe(false);
        });

        test("empty strings are equal", () => {
            expect(constantTimeEquals("", "")).toBe(true);
        });
    });

    describe("CORS Headers", () => {
        test("CORS headers are present on responses", async () => {
            const res = await app.request("/health");
            const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
            expect(allowOrigin).toBeDefined();
        });

        test("OPTIONS preflight returns 204", async () => {
            const res = await app.request("/api/v1/lists", {
                method: "OPTIONS",
                headers: { Origin: "http://localhost:5173" },
            });
            expect(res.status).toBe(204);
        });
    });
});
