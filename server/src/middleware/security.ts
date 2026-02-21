import type { MiddlewareHandler } from "hono";

type SecurityHeadersOptions = {
    frameOptions?: "DENY" | "SAMEORIGIN";
    contentSecurityPolicy?: string;
    hsts?: boolean;
    hstsMaxAge?: number;
    referrerPolicy?: string;
};

export function securityHeaders(options: SecurityHeadersOptions = {}): MiddlewareHandler {
    const {
        frameOptions = "SAMEORIGIN",
        contentSecurityPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
        hsts = true,
        hstsMaxAge = 31536000,
        referrerPolicy = "strict-origin-when-cross-origin",
    } = options;

    return async (c, next) => {
        await next();

        c.res.headers.set("X-Content-Type-Options", "nosniff");
        c.res.headers.set("X-Frame-Options", frameOptions);
        c.res.headers.set("X-XSS-Protection", "1; mode=block");
        c.res.headers.set("Referrer-Policy", referrerPolicy);

        if (contentSecurityPolicy) {
            c.res.headers.set("Content-Security-Policy", contentSecurityPolicy);
        }

        if (hsts && c.req.url.startsWith("https://")) {
            c.res.headers.set("Strict-Transport-Security", `max-age=${hstsMaxAge}; includeSubDomains`);
        }

        c.res.headers.delete("X-Powered-By");
        c.res.headers.delete("Server");
    };
}

export function corsHeaders(options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
} = {}): MiddlewareHandler {
    const {
        origins = ["*"],
        methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        headers = ["Content-Type", "Authorization", "X-Request-Id"],
        credentials = false,
        maxAge = 86400,
    } = options;

    return async (c, next) => {
        const origin = c.req.header("origin");

        if (c.req.method === "OPTIONS") {
            const allowOrigin = origins.includes("*") || (origin && origins.includes(origin)) 
                ? (origins.includes("*") ? "*" : origin) 
                : origins[0];
            
            c.res.headers.set("Access-Control-Allow-Origin", allowOrigin || "*");
            c.res.headers.set("Access-Control-Allow-Methods", methods.join(", "));
            c.res.headers.set("Access-Control-Allow-Headers", headers.join(", "));
            
            if (credentials) {
                c.res.headers.set("Access-Control-Allow-Credentials", "true");
            }
            
            c.res.headers.set("Access-Control-Max-Age", String(maxAge));
            
            return new Response(null, { status: 204, headers: c.res.headers });
        }

        await next();

        const allowOrigin = origins.includes("*") || (origin && origins.includes(origin))
            ? (origins.includes("*") ? "*" : origin)
            : origins[0];

        if (allowOrigin) {
            c.res.headers.set("Access-Control-Allow-Origin", allowOrigin);
        }
        
        c.res.headers.set("Access-Control-Allow-Methods", methods.join(", "));
        c.res.headers.set("Access-Control-Allow-Headers", headers.join(", "));
        
        if (credentials) {
            c.res.headers.set("Access-Control-Allow-Credentials", "true");
        }
    };
}
