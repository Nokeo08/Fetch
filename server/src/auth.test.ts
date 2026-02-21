import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createDatabase, runMigrations, closeDatabase } from "./db";
import { createSessionsService } from "./services/sessions";
import { createRateLimitsService } from "./services/rate-limits";
import { constantTimeEquals, requireAuth, createSessionCookie, clearSessionCookie } from "./middleware/auth";
import type { Config } from "./config/types";
import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

let db: Database;

beforeEach(() => {
    db = createDatabase(":memory:");
    runMigrations(db);
});

afterEach(() => {
    closeDatabase(db);
});

describe("constantTimeEquals", () => {
    it("returns true for equal strings", () => {
        expect(constantTimeEquals("password", "password")).toBe(true);
    });

    it("returns false for different strings", () => {
        expect(constantTimeEquals("password", "wrong")).toBe(false);
    });

    it("returns false for different lengths", () => {
        expect(constantTimeEquals("password", "pass")).toBe(false);
    });

    it("returns true for empty strings", () => {
        expect(constantTimeEquals("", "")).toBe(true);
    });
});

describe("requireAuth middleware", () => {
    const config: Config = {
        port: 3000,
        auth: { password: "test-password", disabled: false },
        api: {},
        database: { path: ":memory:" },
        session: { secret: "test-secret", maxAge: 7 * 24 * 60 * 60 * 1000 },
        rateLimit: { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
    };

    it("returns 401 when no session cookie", async () => {
        const sessionsService = createSessionsService(db);
        const app = new Hono()
            .use("*", requireAuth(sessionsService, config))
            .get("/protected", (c) => c.json({ success: true }));

        const res = await app.request("/protected");
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ success: false, error: "Authentication required" });
    });

    it("returns 401 for invalid session token", async () => {
        const sessionsService = createSessionsService(db);
        const app = new Hono()
            .use("*", requireAuth(sessionsService, config))
            .get("/protected", (c) => c.json({ success: true }));

        const res = await app.request("/protected", {
            headers: { Cookie: "session=invalid-token" },
        });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ success: false, error: "Invalid session" });
    });

    it("allows request with valid session", async () => {
        const sessionsService = createSessionsService(db);
        const session = sessionsService.create(config.session.maxAge);

        const app = new Hono()
            .use("*", requireAuth(sessionsService, config))
            .get("/protected", (c) => c.json({ success: true }));

        const res = await app.request("/protected", {
            headers: { Cookie: `session=${session.token}` },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ success: true });
    });

    it("returns 401 for expired session", async () => {
        const sessionsService = createSessionsService(db);
        const session = sessionsService.create(-1000);

        const app = new Hono()
            .use("*", requireAuth(sessionsService, config))
            .get("/protected", (c) => c.json({ success: true }));

        const res = await app.request("/protected", {
            headers: { Cookie: `session=${session.token}` },
        });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ success: false, error: "Session expired" });
    });

    it("allows all requests when auth is disabled", async () => {
        const disabledConfig: Config = { ...config, auth: { ...config.auth, disabled: true } };
        const sessionsService = createSessionsService(db);

        const app = new Hono()
            .use("*", requireAuth(sessionsService, disabledConfig))
            .get("/protected", (c) => c.json({ success: true }));

        const res = await app.request("/protected");
        expect(res.status).toBe(200);
    });
});

describe("session cookies", () => {
    it("createSessionCookie sets correct cookie attributes", async () => {
        const config: Config = {
            port: 3000,
            auth: { password: "test", disabled: false },
            api: {},
            database: { path: ":memory:" },
            session: { secret: "test-secret", maxAge: 7 * 24 * 60 * 60 * 1000 },
            rateLimit: { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
        };

        const app = new Hono().get("/set-cookie", (c) => {
            createSessionCookie(c, "test-token", config);
            return c.json({ success: true });
        });

        const res = await app.request("/set-cookie");
        const setCookie = res.headers.get("set-cookie");
        expect(setCookie).toContain("session=test-token");
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("Path=/");
    });

    it("clearSessionCookie clears the cookie", async () => {
        const app = new Hono().get("/clear-cookie", (c) => {
            clearSessionCookie(c);
            return c.json({ success: true });
        });

        const res = await app.request("/clear-cookie");
        const setCookie = res.headers.get("set-cookie");
        expect(setCookie).toContain("session=");
        expect(setCookie).toContain("Max-Age=0");
    });
});

describe("session service with last_activity", () => {
    it("creates session with last_activity", () => {
        const sessionsService = createSessionsService(db);
        const session = sessionsService.create(3600000);

        expect(session.token).toBeDefined();
        expect(session.lastActivity).toBeDefined();
    });

    it("updates last_activity on updateActivity", () => {
        const sessionsService = createSessionsService(db);
        const session = sessionsService.create(3600000);

        const originalActivity = session.lastActivity;

        const updated = sessionsService.updateActivity(session.token);
        expect(updated?.lastActivity).toBeDefined();
    });

    it("extends session and updates last_activity", () => {
        const sessionsService = createSessionsService(db);
        const session = sessionsService.create(3600000);

        const extended = sessionsService.extend(session.token, 7200000);
        expect(extended?.lastActivity).toBeDefined();
    });
});

describe("rate limiting for login", () => {
    const config: Config = {
        port: 3000,
        auth: { password: "test-password", disabled: false },
        api: {},
        database: { path: ":memory:" },
        session: { secret: "test-secret", maxAge: 7 * 24 * 60 * 60 * 1000 },
        rateLimit: { maxAttempts: 3, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
    };

    it("tracks failed login attempts", () => {
        const rateLimitsService = createRateLimitsService(db, config.rateLimit);

        rateLimitsService.recordAttempt("192.168.1.1");
        expect(rateLimitsService.getRemainingAttempts("192.168.1.1")).toBe(2);

        rateLimitsService.recordAttempt("192.168.1.1");
        expect(rateLimitsService.getRemainingAttempts("192.168.1.1")).toBe(1);
    });

    it("locks out after max attempts", () => {
        const rateLimitsService = createRateLimitsService(db, config.rateLimit);

        rateLimitsService.recordAttempt("192.168.1.2");
        rateLimitsService.recordAttempt("192.168.1.2");
        rateLimitsService.recordAttempt("192.168.1.2");

        expect(rateLimitsService.isLocked("192.168.1.2")).toBe(true);
    });

    it("resets on successful login", () => {
        const rateLimitsService = createRateLimitsService(db, config.rateLimit);

        rateLimitsService.recordAttempt("192.168.1.3");
        rateLimitsService.recordAttempt("192.168.1.3");
        rateLimitsService.resetOnSuccess("192.168.1.3");

        expect(rateLimitsService.getRemainingAttempts("192.168.1.3")).toBe(3);
        expect(rateLimitsService.isLocked("192.168.1.3")).toBe(false);
    });
});
