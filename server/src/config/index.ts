import { resolve } from "path";
import type { Config } from "./types";

const PROJECT_ROOT = resolve(import.meta.dir, "../../..");

function resolveDatabasePath(envPath: string | undefined): string {
    const dbPath = envPath || "./data/fetch.db";
    if (dbPath === ":memory:") return dbPath;
    if (dbPath.startsWith("/")) return dbPath;
    return resolve(PROJECT_ROOT, dbPath);
}

export function getConfig(): Config {
    return {
        port: parseInt(process.env.PORT || "3000", 10),
        auth: {
            password: process.env.APP_PASSWORD || "",
            disabled: process.env.DISABLE_AUTH === "true",
        },
        api: {
            token: process.env.API_TOKEN || undefined,
        },
        database: {
            path: resolveDatabasePath(process.env.DATABASE_PATH),
        },
        session: {
            secret: process.env.SESSION_SECRET || generateRandomSecret(),
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
        rateLimit: {
            maxAttempts: 5,
            windowMs: 15 * 60 * 1000,
            lockoutMs: 30 * 60 * 1000,
        },
    };
}

function generateRandomSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateConfig(config: Config): void {
    if (!config.auth.disabled && !config.auth.password) {
        throw new Error(
            "APP_PASSWORD is required when authentication is enabled. " +
                "Set APP_PASSWORD in your environment or set DISABLE_AUTH=true."
        );
    }
}
