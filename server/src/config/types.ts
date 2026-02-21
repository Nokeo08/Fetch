export type Config = {
    port: number;
    auth: {
        password: string;
        disabled: boolean;
    };
    api: {
        token?: string;
    };
    database: {
        path: string;
    };
    session: {
        secret: string;
        maxAge: number;
    };
    rateLimit: {
        maxAttempts: number;
        windowMs: number;
        lockoutMs: number;
    };
};
