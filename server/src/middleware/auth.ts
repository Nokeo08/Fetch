import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { SessionsService } from "../services/sessions";
import type { Config } from "../config/types";
import type { AppVariables } from "../index";

export type AuthVariables = {
    session: {
        token: string;
    };
};

function extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const match = header.match(/^Bearer\s+(\S+)$/i);
    return match?.[1] ?? null;
}

export function requireAuth(
    sessionsService: SessionsService,
    config: Config
): MiddlewareHandler<{ Variables: AppVariables & AuthVariables }> {
    return async (c, next) => {
        if (config.auth.disabled) {
            return next();
        }

        const bearerToken = extractBearerToken(c.req.header("authorization"));
        if (bearerToken && config.api.token) {
            if (constantTimeEquals(bearerToken, config.api.token)) {
                return next();
            }
            return c.json<{ success: false; error: string; code: string }>(
                { success: false, error: "Invalid API token", code: "UNAUTHORIZED" },
                401
            );
        }

        const sessionToken = getCookie(c, "session");

        if (!sessionToken) {
            return c.json<{ success: false; error: string; code: string }>(
                { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
                401
            );
        }

        const session = sessionsService.getByToken(sessionToken);

        if (!session) {
            return c.json<{ success: false; error: string; code: string }>(
                { success: false, error: "Invalid session", code: "UNAUTHORIZED" },
                401
            );
        }

        const expiresAt = new Date(session.expiresAt);
        if (expiresAt <= new Date()) {
            sessionsService.delete(sessionToken);
            return c.json<{ success: false; error: string; code: string }>(
                { success: false, error: "Session expired", code: "UNAUTHORIZED" },
                401
            );
        }

        sessionsService.updateActivity(sessionToken);

        c.set("session", { token: sessionToken });

        return next();
    };
}

export function optionallyAuth(
    sessionsService: SessionsService,
    config: Config
): MiddlewareHandler<{ Variables: AppVariables & AuthVariables }> {
    return async (c, next) => {
        if (config.auth.disabled) {
            return next();
        }

        const sessionToken = getCookie(c, "session");

        if (sessionToken) {
            const session = sessionsService.getByToken(sessionToken);

            if (session) {
                const expiresAt = new Date(session.expiresAt);
                if (expiresAt > new Date()) {
                    sessionsService.updateActivity(sessionToken);
                    c.set("session", { token: sessionToken });
                }
            }
        }

        return next();
    };
}

export function createSessionCookie(
    c: Context,
    token: string,
    config: Config
): void {
    const isProduction = process.env.NODE_ENV === "production";

    setCookie(c, "session", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "Lax",
        path: "/",
        maxAge: Math.floor(config.session.maxAge / 1000),
    });
}

export function clearSessionCookie(c: Context): void {
    setCookie(c, "session", "", {
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        path: "/",
        maxAge: 0,
    });
}

export function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}
