import type { Context, ErrorHandler, MiddlewareHandler } from "hono";

export type AppError = {
    message: string;
    code?: string;
    status?: number;
    details?: Record<string, unknown>;
};

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly message: string,
        public readonly code?: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "HttpError";
    }

    static badRequest(message: string, details?: Record<string, unknown>): HttpError {
        return new HttpError(400, message, "BAD_REQUEST", details);
    }

    static unauthorized(message: string = "Unauthorized"): HttpError {
        return new HttpError(401, message, "UNAUTHORIZED");
    }

    static forbidden(message: string = "Forbidden"): HttpError {
        return new HttpError(403, message, "FORBIDDEN");
    }

    static notFound(message: string = "Not found"): HttpError {
        return new HttpError(404, message, "NOT_FOUND");
    }

    static conflict(message: string): HttpError {
        return new HttpError(409, message, "CONFLICT");
    }

    static tooManyRequests(message: string, retryAfter?: number): HttpError {
        const details = retryAfter ? { retryAfter } : undefined;
        return new HttpError(429, message, "TOO_MANY_REQUESTS", details);
    }

    static internal(message: string = "Internal server error"): HttpError {
        return new HttpError(500, message, "INTERNAL_ERROR");
    }
}

export function errorHandler(): MiddlewareHandler {
    return async (c, next) => {
        try {
            await next();
        } catch (err) {
            const error = normalizeError(err);
            
            if (error.status !== undefined && error.status >= 500) {
                console.error(`[Error] ${error.code}: ${error.message}`, {
                    path: c.req.path,
                    method: c.req.method,
                    details: error.details,
                });
            }

            return c.json(
                {
                    success: false,
                    error: error.message,
                    code: error.code,
                    ...(error.details ? { details: error.details } : {}),
                },
                error.status as 400 | 401 | 403 | 404 | 409 | 429 | 500
            );
        }
    };
}

export function createErrorHandler(): ErrorHandler {
    return (err, c) => {
        const error = normalizeError(err);
        
        if (error.status !== undefined && error.status >= 500) {
            console.error(`[Error] ${error.code}: ${error.message}`, {
                path: c.req.path,
                method: c.req.method,
                details: error.details,
            });
        }

        return c.json(
            {
                success: false,
                error: error.message,
                code: error.code,
                ...(error.details ? { details: error.details } : {}),
            },
            error.status as 400 | 401 | 403 | 404 | 409 | 429 | 500
        );
    };
}

function normalizeError(err: unknown): AppError {
    if (err instanceof HttpError) {
        return {
            message: err.message,
            code: err.code,
            status: err.status,
            details: err.details,
        };
    }

    if (err instanceof Error) {
        if (err.name === "SyntaxError") {
            return {
                message: "Invalid JSON in request body",
                code: "INVALID_JSON",
                status: 400,
            };
        }

        return {
            message: err.message || "Internal server error",
            code: "INTERNAL_ERROR",
            status: 500,
        };
    }

    return {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
        status: 500,
    };
}

export function notFoundHandler(c: Context) {
    return c.json(
        {
            success: false,
            error: `Route ${c.req.method} ${c.req.path} not found`,
            code: "NOT_FOUND",
        },
        404
    );
}
