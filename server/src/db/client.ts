import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";

export type DatabaseConfig = {
    path: string;
    busyTimeout?: number;
    maxRetries?: number;
    retryDelay?: number;
};

export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
        public readonly code?: string
    ) {
        super(message);
        this.name = "DatabaseError";
    }
}

function ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function sleepSync(ms: number): void {
    const start = Date.now();
    while (Date.now() - start < ms) {}
}

export function createDatabase(config: string | DatabaseConfig): Database {
    const cfg: DatabaseConfig = typeof config === "string" ? { path: config } : config;
    const { path: dbPath, busyTimeout = 5000, maxRetries = 3, retryDelay = 100 } = cfg;

    ensureDirectoryExists(dbPath);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const db = new Database(dbPath, { create: true, readwrite: true });

            db.exec("PRAGMA journal_mode = WAL;");
            db.exec("PRAGMA foreign_keys = ON;");
            db.exec(`PRAGMA busy_timeout = ${busyTimeout};`);
            db.exec("PRAGMA synchronous = NORMAL;");
            db.exec("PRAGMA cache_size = -64000;");

            return db;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                sleepSync(retryDelay * attempt);
            }
        }
    }

    throw new DatabaseError(
        `Failed to connect to database after ${maxRetries} attempts: ${dbPath}`,
        lastError ?? undefined,
        "CONNECTION_FAILED"
    );
}

export function closeDatabase(db: Database): void {
    try {
        db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
        db.close();
    } catch (err) {
        throw new DatabaseError(
            "Failed to close database gracefully",
            err instanceof Error ? err : undefined,
            "CLOSE_FAILED"
        );
    }
}

export function withTransaction<T>(db: Database, fn: () => T): T {
    try {
        return db.transaction(fn)();
    } catch (err) {
        throw new DatabaseError(
            "Transaction failed",
            err instanceof Error ? err : undefined,
            "TRANSACTION_FAILED"
        );
    }
}
