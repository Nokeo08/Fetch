import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { Database } from "bun:sqlite";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { createTestConfig } from "../test-helpers/config";
import { resetCounters } from "../test-helpers/factories";
import { requireAuth, createSessionCookie, clearSessionCookie, constantTimeEquals } from "../middleware/auth";
import type { Config } from "../config/types";
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

function createLoginApp(config: Config, services: TestServices) {
    return new Hono()
        .post("/api/login", async (c) => {
            if (config.auth.disabled) {
                return c.json({ success: true, data: { message: "Authentication disabled" } });
            }

            const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

            if (services.rateLimits.isLocked(ip)) {
                const remaining = services.rateLimits.getLockoutRemaining(ip);
                c.header("Retry-After", String(Math.ceil(remaining / 1000)));
                return c.json({ success: false, error: "Too many failed attempts" }, 429);
            }

            let body: { password?: string };
            try {
                body = await c.req.json<{ password?: string }>();
            } catch {
                return c.json({ success: false, error: "Invalid request body" }, 400);
            }

            const { password } = body;
            if (!password || typeof password !== "string") {
                services.rateLimits.recordAttempt(ip);
                return c.json({ success: false, error: "Invalid credentials" }, 401);
            }

            if (!constantTimeEquals(password, config.auth.password)) {
                services.rateLimits.recordAttempt(ip);
                return c.json({ success: false, error: "Invalid credentials" }, 401);
            }

            services.rateLimits.resetOnSuccess(ip);
            const session = services.sessions.create(config.session.maxAge);
            createSessionCookie(c, session.token, config);
            return c.json({ success: true, data: { message: "Logged in successfully" } });
        })
        .post("/api/logout", (c) => {
            clearSessionCookie(c);
            return c.json({ success: true, data: { message: "Logged out" } });
        })
        .use("/api/v1/*", requireAuth(services.sessions, config))
        .get("/api/v1/protected", (c) => c.json({ success: true }));
}

describe("Authentication Flow Integration", () => {
    describe("Login with valid credentials", () => {
        test("POST /api/login with correct password returns success", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: "test-password" }),
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(true);
        });

        test("successful login sets session cookie", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: "test-password" }),
            });

            const setCookie = res.headers.get("set-cookie");
            expect(setCookie).toBeDefined();
            expect(setCookie).toContain("session=");
            expect(setCookie).toContain("HttpOnly");
        });
    });

    describe("Login with invalid password", () => {
        test("POST /api/login with wrong password returns 401", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: "wrong-password" }),
            });

            expect(res.status).toBe(401);
            const data = (await res.json()) as { success: boolean; error: string };
            expect(data.success).toBe(false);
            expect(data.error).toBeDefined();
        });

        test("POST /api/login with missing password returns 401", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(401);
        });

        test("POST /api/login with invalid JSON returns 400", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "not-json",
            });

            expect(res.status).toBe(400);
        });
    });

    describe("Session persistence", () => {
        test("session cookie can be used for protected routes", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const loginRes = await app.request("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: "test-password" }),
            });

            const setCookie = loginRes.headers.get("set-cookie");
            const sessionMatch = setCookie?.match(/session=([^;]+)/);
            const sessionToken = sessionMatch?.[1];
            expect(sessionToken).toBeDefined();

            const protectedRes = await app.request("/api/v1/protected", {
                headers: { Cookie: `session=${sessionToken}` },
            });
            expect(protectedRes.status).toBe(200);
        });

        test("invalid session cannot access protected routes", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected", {
                headers: { Cookie: "session=invalid-token" },
            });
            expect(res.status).toBe(401);
        });
    });

    describe("Logout", () => {
        test("POST /api/logout clears session cookie", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/logout", { method: "POST" });
            expect(res.status).toBe(200);

            const setCookie = res.headers.get("set-cookie");
            expect(setCookie).toContain("Max-Age=0");
        });

        test("POST /api/logout returns success", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/logout", { method: "POST" });
            const data = (await res.json()) as { success: boolean };
            expect(data.success).toBe(true);
        });
    });

    describe("Access protected routes", () => {
        test("requireAuth middleware rejects without auth", async () => {
            const config = createTestConfig();
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected");
            expect(res.status).toBe(401);
        });

        test("requireAuth middleware accepts valid session", async () => {
            const config = createTestConfig();
            const session = services.sessions.create(config.session.maxAge);
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected", {
                headers: { Cookie: `session=${session.token}` },
            });
            expect(res.status).toBe(200);
        });

        test("requireAuth middleware rejects expired sessions", async () => {
            const config = createTestConfig();
            const session = services.sessions.create(-1000);
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected", {
                headers: { Cookie: `session=${session.token}` },
            });
            expect(res.status).toBe(401);
        });

        test("bearer token authentication works", async () => {
            const config = createTestConfig({ api: { token: "test-api-token" } });
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected", {
                headers: { Authorization: "Bearer test-api-token" },
            });
            expect(res.status).toBe(200);
        });

        test("invalid bearer token returns 401", async () => {
            const config = createTestConfig({ api: { token: "test-api-token" } });
            const app = createLoginApp(config, services);

            const res = await app.request("/api/v1/protected", {
                headers: { Authorization: "Bearer wrong-token" },
            });
            expect(res.status).toBe(401);
        });
    });
});
