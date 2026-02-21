import type { MiddlewareHandler } from "hono";

type LogLevel = "debug" | "info" | "warn" | "error";

interface RequestLog {
    requestId: string;
    method: string;
    path: string;
    query?: string;
    status: number;
    duration: number;
    ip?: string;
    userAgent?: string;
}

function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getStatusLevel(status: number): LogLevel {
    if (status >= 500) return "error";
    if (status >= 400) return "warn";
    return "info";
}

function formatLog(log: RequestLog): string {
    const level = getStatusLevel(log.status);
    const prefix = `[${level.toUpperCase()}]`;
    const duration = `${log.duration}ms`;
    const query = log.query ? `?${log.query}` : "";
    
    return `${prefix} ${log.requestId} | ${log.method} ${log.path}${query} | ${log.status} | ${duration}`;
}

export function requestLogger(): MiddlewareHandler {
    return async (c, next) => {
        const requestId = generateRequestId();
        const start = Date.now();

        c.set("requestId", requestId);

        await next();

        const duration = Date.now() - start;
        const queryObj = c.req.query();
        const log: RequestLog = {
            requestId,
            method: c.req.method,
            path: c.req.path,
            query: Object.keys(queryObj).length > 0 ? new URLSearchParams(queryObj).toString() : undefined,
            status: c.res.status,
            duration,
            ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
            userAgent: c.req.header("user-agent"),
        };

        const level = getStatusLevel(log.status);
        const message = formatLog(log);

        switch (level) {
            case "error":
                console.error(message);
                break;
            case "warn":
                console.warn(message);
                break;
            default:
                console.log(message);
        }

        c.res.headers.set("X-Request-Id", requestId);
    };
}

export function requestIdMiddleware(): MiddlewareHandler {
    return async (c, next) => {
        const requestId = c.req.header("x-request-id") || generateRequestId();
        c.set("requestId", requestId);
        
        await next();
        
        c.res.headers.set("X-Request-Id", requestId);
    };
}
