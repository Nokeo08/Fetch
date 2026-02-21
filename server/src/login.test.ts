import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { createDatabase, runMigrations, closeDatabase } from "./db";
import { createSessionsService } from "./services/sessions";
import { createRateLimitsService } from "./services/rate-limits";
import {
    requireAuth,
    createSessionCookie,
    clearSessionCookie,
    constantTimeEquals,
} from "./middleware/auth";
import type { Config } from "./config/types";
import type { Database } from "bun:sqlite";
import type { ApiResponse } from "shared/dist";

let db: Database;

beforeEach(() => {
    db = createDatabase(":memory:");
    runMigrations(db);
});

afterEach(() => {
    closeDatabase(db);
});

function createLoginApp(config: Config) {
    const sessionsService = createSessionsService(db);
    const rateLimitsService = createRateLimitsService(db, config.rateLimit);

    return new Hono()
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
        });
}

describe("Login endpoint rate limiting", () => {
    const config: Config = {
        port: 3000,
        auth: { password: "correct-password", disabled: false },
        api: {},
        database: { path: ":memory:" },
        session: { secret: "test-secret", maxAge: 7 * 24 * 60 * 60 * 1000 },
        rateLimit: { maxAttempts: 3, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
    };

    it("returns 401 with generic error for wrong password", async () => {
        const app = createLoginApp(config);

        const res = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.1",
            },
            body: JSON.stringify({ password: "wrong-password" }),
        });

        expect(res.status).toBe(401);
        const body = (await res.json()) as ApiResponse;
        expect(body.success).toBe(false);
        expect(body.error).toBe("Invalid credentials");
    });

    it("returns 401 with generic error for missing password", async () => {
        const app = createLoginApp(config);

        const res = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.2",
            },
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(401);
        const body = (await res.json()) as ApiResponse;
        expect(body.success).toBe(false);
        expect(body.error).toBe("Invalid credentials");
    });

    it("locks out after max attempts and returns 429", async () => {
        const app = createLoginApp(config);

        for (let i = 0; i < 3; i++) {
            const res = await app.request("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Real-IP": "10.0.0.3",
                },
                body: JSON.stringify({ password: "wrong" }),
            });
            expect(res.status).toBe(401);
        }

        const lockedRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.3",
            },
            body: JSON.stringify({ password: "wrong" }),
        });

        expect(lockedRes.status).toBe(429);
        const body = (await lockedRes.json()) as ApiResponse;
        expect(body.success).toBe(false);
        expect(body.error).toBe("Too many failed attempts. Please try again later.");
    });

    it("includes Retry-After header when locked out", async () => {
        const app = createLoginApp(config);

        for (let i = 0; i < 3; i++) {
            await app.request("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Real-IP": "10.0.0.4",
                },
                body: JSON.stringify({ password: "wrong" }),
            });
        }

        const lockedRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.4",
            },
            body: JSON.stringify({ password: "wrong" }),
        });

        const retryAfter = lockedRes.headers.get("Retry-After");
        expect(retryAfter).not.toBeNull();
        const retrySeconds = parseInt(retryAfter!, 10);
        expect(retrySeconds).toBeGreaterThan(0);
        expect(retrySeconds).toBeLessThanOrEqual(1800);
    });

    it("resets counter on successful login", async () => {
        const app = createLoginApp(config);

        await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.5",
            },
            body: JSON.stringify({ password: "wrong" }),
        });

        const successRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.5",
            },
            body: JSON.stringify({ password: "correct-password" }),
        });

        expect(successRes.status).toBe(200);

        for (let i = 0; i < 3; i++) {
            const res = await app.request("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Real-IP": "10.0.0.5",
                },
                body: JSON.stringify({ password: "wrong" }),
            });
            expect(res.status).toBe(401);
        }
    });

    it("tracks rate limits per IP", async () => {
        const app = createLoginApp(config);

        for (let i = 0; i < 3; i++) {
            await app.request("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Real-IP": "10.0.0.6",
                },
                body: JSON.stringify({ password: "wrong" }),
            });
        }

        const lockedRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.6",
            },
            body: JSON.stringify({ password: "wrong" }),
        });
        expect(lockedRes.status).toBe(429);

        const otherIpRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Real-IP": "10.0.0.7",
            },
            body: JSON.stringify({ password: "correct-password" }),
        });
        expect(otherIpRes.status).toBe(200);
    });

    it("respects X-Forwarded-For header", async () => {
        const app = createLoginApp(config);

        for (let i = 0; i < 3; i++) {
            await app.request("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Forwarded-For": "192.168.1.100, 10.0.0.1",
                },
                body: JSON.stringify({ password: "wrong" }),
            });
        }

        const lockedRes = await app.request("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "192.168.1.100, 10.0.0.1",
            },
            body: JSON.stringify({ password: "wrong" }),
        });
        expect(lockedRes.status).toBe(429);
    });
});
