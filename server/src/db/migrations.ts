import type { Database } from "bun:sqlite";
import { CREATE_TABLES, CREATE_INDEXES, SCHEMA_VERSION } from "./schema";

type Migration = {
    version: number;
    name: string;
    up: (db: Database) => void;
    down: string;
};

function hasColumn(db: Database, table: string, column: string): boolean {
    const result = db.query<{ name: string }[], []>(
        `SELECT name FROM pragma_table_info('${table}') WHERE name = '${column}'`
    ).all();
    return result.length > 0;
}

const MIGRATIONS: Migration[] = [
    {
        version: 1,
        name: "initial_schema",
        up: () => {},
        down: `
            DROP INDEX IF EXISTS idx_sections_list_id;
            DROP INDEX IF EXISTS idx_items_section_id;
            DROP INDEX IF EXISTS idx_template_items_template_id;
            DROP INDEX IF EXISTS idx_sessions_expires_at;
            DROP INDEX IF EXISTS idx_lists_is_active;
            DROP TABLE IF EXISTS rate_limits;
            DROP TABLE IF EXISTS template_items;
            DROP TABLE IF EXISTS templates;
            DROP TABLE IF EXISTS history;
            DROP TABLE IF EXISTS items;
            DROP TABLE IF EXISTS sections;
            DROP TABLE IF EXISTS lists;
            DROP TABLE IF EXISTS sessions;
            DROP TABLE IF EXISTS schema_version;
        `,
    },
    {
        version: 2,
        name: "add_session_last_activity",
        up: (db: Database) => {
            if (!hasColumn(db, "sessions", "last_activity")) {
                db.exec("ALTER TABLE sessions ADD COLUMN last_activity DATETIME DEFAULT CURRENT_TIMESTAMP");
            }
        },
        down: `
            ALTER TABLE sessions DROP COLUMN last_activity;
        `,
    },
    {
        version: 3,
        name: "add_unique_list_name",
        up: (db: Database) => {
            db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_name_unique ON lists(name COLLATE NOCASE)");
        },
        down: `
            DROP INDEX IF EXISTS idx_lists_name_unique;
        `,
    },
];

function schemaTableExists(db: Database): boolean {
    const result = db
        .query<{ count: number }, []>(
            "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='schema_version'"
        )
        .get();
    return (result?.count ?? 0) > 0;
}

export function runMigrations(db: Database): void {
    db.transaction(() => {
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);

        const currentVersion = getSchemaVersion(db);

        if (currentVersion < SCHEMA_VERSION) {
            for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
                const migration = MIGRATIONS.find((m) => m.version === v);
                if (migration && migration.up) {
                    migration.up(db);
                }
                recordMigration(db, v);
            }
        }
    })();
}

export function rollbackMigration(db: Database): number | null {
    if (!schemaTableExists(db)) {
        return null;
    }

    const currentVersion = getSchemaVersion(db);
    if (currentVersion <= 0) {
        return null;
    }

    const migration = MIGRATIONS.find((m) => m.version === currentVersion);
    if (!migration) {
        return null;
    }

    db.transaction(() => {
        db.query("DELETE FROM schema_version WHERE version = ?").run(currentVersion);
        if (migration.down) {
            db.exec(migration.down);
        }
    })();

    return currentVersion;
}

function getSchemaVersion(db: Database): number {
    if (!schemaTableExists(db)) {
        return 0;
    }

    const result = db
        .query<{ version: number }, []>("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        .get();
    return result?.version ?? 0;
}

function recordMigration(db: Database, version: number): void {
    db.query("INSERT INTO schema_version (version) VALUES (?)").run(version);
}

export function getAppliedMigrations(db: Database): { version: number; applied_at: string }[] {
    if (!schemaTableExists(db)) {
        return [];
    }
    return db.query<{ version: number; applied_at: string }, []>("SELECT version, applied_at FROM schema_version ORDER BY version ASC").all();
}

export function cleanupExpiredSessions(db: Database): number {
    const result = db.query("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')").run();
    return result.changes;
}

export function cleanupExpiredRateLimits(db: Database): number {
    const result = db
        .query("DELETE FROM rate_limits WHERE locked_until IS NOT NULL AND datetime(locked_until) < datetime('now')")
        .run();
    return result.changes;
}

export { SCHEMA_VERSION };
