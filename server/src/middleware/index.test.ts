import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { errorHandler, createErrorHandler, notFoundHandler, HttpError } from "./error";
import { requestLogger } from "./logger";
import { securityHeaders, corsHeaders } from "./security";
import { createSessionCookie } from "./auth";
import type { Config } from "../config/types";

describe("Error Middleware", () => {
    test("passes through successful requests", async () => {
        const app = new Hono().use(errorHandler()).get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect((data as { ok: boolean }).ok).toBe(true);
    });

    test("handles HttpError with onError", async () => {
        const app = new Hono();
        app.onError(createErrorHandler());
        app.get("/test", () => {
            throw new HttpError(404, "Not found", "NOT_FOUND");
        });

        const res = await app.request("/test");
        expect(res.status).toBe(404);
        const data = await res.json();
        expect((data as { success: boolean }).success).toBe(false);
        expect((data as { error: string }).error).toBe("Not found");
    });

    test("handles generic errors with onError", async () => {
        const app = new Hono();
        app.onError(createErrorHandler());
        app.get("/test", () => {
            throw new Error("Something went wrong");
        });

        const res = await app.request("/test");
        expect(res.status).toBe(500);
        const data = await res.json();
        expect((data as { success: boolean }).success).toBe(false);
        expect((data as { error: string }).error).toBe("Something went wrong");
    });

    test("notFoundHandler returns 404", async () => {
        const app = new Hono().notFound(notFoundHandler);

        const res = await app.request("/unknown");
        expect(res.status).toBe(404);
        const data = await res.json();
        expect((data as { success: boolean }).success).toBe(false);
        expect((data as { code: string }).code).toBe("NOT_FOUND");
    });
});

describe("HttpError Factory Methods", () => {
    test("badRequest creates 400 error", () => {
        const err = HttpError.badRequest("Invalid input", { field: "name" });
        expect(err.status).toBe(400);
        expect(err.code).toBe("BAD_REQUEST");
        expect(err.details).toEqual({ field: "name" });
    });

    test("unauthorized creates 401 error", () => {
        const err = HttpError.unauthorized();
        expect(err.status).toBe(401);
        expect(err.code).toBe("UNAUTHORIZED");
    });

    test("forbidden creates 403 error", () => {
        const err = HttpError.forbidden();
        expect(err.status).toBe(403);
        expect(err.code).toBe("FORBIDDEN");
    });

    test("notFound creates 404 error", () => {
        const err = HttpError.notFound("Item not found");
        expect(err.status).toBe(404);
        expect(err.message).toBe("Item not found");
    });

    test("tooManyRequests creates 429 error with retryAfter", () => {
        const err = HttpError.tooManyRequests("Rate limited", 300);
        expect(err.status).toBe(429);
        expect(err.details?.retryAfter).toBe(300);
    });
});

describe("Request Logger Middleware", () => {
    test("adds X-Request-Id header", async () => {
        const app = new Hono()
            .use(requestLogger())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        const requestId = res.headers.get("X-Request-Id");
        expect(requestId).toBeDefined();
        expect(requestId?.length).toBeGreaterThan(0);
    });
});

describe("Security Headers Middleware", () => {
    test("sets security headers", async () => {
        const app = new Hono()
            .use(securityHeaders())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");

        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
        expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
        expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    test("sets Content-Security-Policy", async () => {
        const app = new Hono()
            .use(securityHeaders())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        const csp = res.headers.get("Content-Security-Policy");
        expect(csp).toBeDefined();
        expect(csp).toContain("default-src 'self'");
    });

    test("CSP connect-src allows WebSocket connections", async () => {
        const app = new Hono()
            .use(securityHeaders())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        const csp = res.headers.get("Content-Security-Policy");
        expect(csp).toContain("connect-src 'self' ws: wss:");
    });

    test("allows custom frame options", async () => {
        const app = new Hono()
            .use(securityHeaders({ frameOptions: "DENY" }))
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
});

describe("CORS Headers Middleware", () => {
    test("handles OPTIONS preflight", async () => {
        const app = new Hono()
            .use(corsHeaders())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test", { method: "OPTIONS" });
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("Access-Control-Allow-Methods")).toBeDefined();
    });

    test("adds CORS headers to responses", async () => {
        const app = new Hono()
            .use(corsHeaders())
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test");
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    test("respects allowed origins", async () => {
        const app = new Hono()
            .use(corsHeaders({ origins: ["https://example.com"] }))
            .get("/test", (c) => c.json({ ok: true }));

        const res = await app.request("/test", {
            headers: { Origin: "https://example.com" },
        });
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
    });
});

describe("Session Cookie Secure Flag", () => {
    const mockConfig: Config = {
        port: 3000,
        auth: { password: "test", disabled: false },
        api: {},
        database: { path: ":memory:" },
        session: { secret: "test-secret", maxAge: 86400000 },
        rateLimit: { maxAttempts: 5, windowMs: 900000, lockoutMs: 1800000 },
    };

    test("sets Secure flag for HTTPS requests", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("https://example.com/test");
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).toContain("Secure");
    });

    test("does not set Secure flag for HTTP requests", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("http://192.168.1.198:3000/test");
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).not.toContain("Secure");
    });

    test("respects X-Forwarded-Proto header for HTTPS behind proxy", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("http://localhost:3000/test", {
            headers: { "X-Forwarded-Proto": "https" },
        });
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).toContain("Secure");
    });

    test("respects X-Forwarded-Proto header for HTTP behind proxy", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("https://localhost:3000/test", {
            headers: { "X-Forwarded-Proto": "http" },
        });
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).not.toContain("Secure");
    });

    test("sets HttpOnly flag on session cookie", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("http://localhost:3000/test");
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).toContain("HttpOnly");
    });

    test("sets SameSite=Lax on session cookie", async () => {
        const app = new Hono()
            .get("/test", (c) => {
                createSessionCookie(c, "test-token", mockConfig);
                return c.json({ ok: true });
            });

        const res = await app.request("http://localhost:3000/test");
        const setCookie = res.headers.get("Set-Cookie") || "";
        expect(setCookie).toContain("SameSite=Lax");
    });
});
