import { Database } from "bun:sqlite";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";
import { runMigrations } from "../db/migrations";
import { createListsService } from "../services/lists";
import { createSectionsService } from "../services/sections";
import { createItemsService } from "../services/items";
import { createSessionsService } from "../services/sessions";
import { createRateLimitsService } from "../services/rate-limits";
import { createTemplatesService } from "../services/templates";
import { createImportExportService } from "../services/import-export";
import type { RateLimitConfig } from "../services/rate-limits";

export type TestServices = {
    db: Database;
    lists: ReturnType<typeof createListsService>;
    sections: ReturnType<typeof createSectionsService>;
    items: ReturnType<typeof createItemsService>;
    sessions: ReturnType<typeof createSessionsService>;
    rateLimits: ReturnType<typeof createRateLimitsService>;
    templates: ReturnType<typeof createTemplatesService>;
    importExport: ReturnType<typeof createImportExportService>;
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    lockoutMs: 30 * 60 * 1000,
};

export function createTestDb(): Database {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(CREATE_TABLES);
    db.exec(CREATE_INDEXES);
    runMigrations(db);
    return db;
}

export function createTestServices(
    db?: Database,
    rateLimitConfig?: RateLimitConfig
): TestServices {
    const testDb = db ?? createTestDb();
    const config = rateLimitConfig ?? DEFAULT_RATE_LIMIT_CONFIG;

    return {
        db: testDb,
        lists: createListsService(testDb),
        sections: createSectionsService(testDb),
        items: createItemsService(testDb),
        sessions: createSessionsService(testDb),
        rateLimits: createRateLimitsService(testDb, config),
        templates: createTemplatesService(testDb),
        importExport: createImportExportService(testDb),
    };
}
