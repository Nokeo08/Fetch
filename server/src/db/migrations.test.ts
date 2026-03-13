import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations, rollbackMigration, getAppliedMigrations, cleanupExpiredSessions, cleanupExpiredRateLimits, SCHEMA_VERSION } from "./migrations";
import { CREATE_TABLES, CREATE_INDEXES } from "./schema";

let db: Database;

beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
});

afterEach(() => {
    db?.close();
});

describe("Migrations", () => {
    describe("runMigrations", () => {
        test("creates all tables", () => {
            runMigrations(db);

            const tables = db
                .query<{ name: string }, []>(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                )
                .all()
                .map((t) => t.name);

            expect(tables).toContain("lists");
            expect(tables).toContain("sections");
            expect(tables).toContain("items");
            expect(tables).toContain("history");
            expect(tables).toContain("templates");
            expect(tables).toContain("template_items");
            expect(tables).toContain("sessions");
            expect(tables).toContain("rate_limits");
            expect(tables).toContain("schema_version");
        });

        test("records schema version", () => {
            runMigrations(db);

            const versions = db
                .query<{ version: number }, []>("SELECT version FROM schema_version ORDER BY version")
                .all();

            expect(versions.length).toBeGreaterThanOrEqual(1);
            const maxVersion = versions[versions.length - 1]?.version;
            expect(maxVersion).toBe(SCHEMA_VERSION);
        });

        test("is idempotent - running twice does not error", () => {
            runMigrations(db);
            expect(() => runMigrations(db)).not.toThrow();
        });

        test("applies all migrations up to SCHEMA_VERSION", () => {
            runMigrations(db);
            const applied = getAppliedMigrations(db);
            expect(applied.length).toBe(SCHEMA_VERSION);
        });

        test("session table has last_activity column after migration", () => {
            runMigrations(db);
            const columns = db
                .query<{ name: string }, []>("SELECT name FROM pragma_table_info('sessions')")
                .all()
                .map((c) => c.name);
            expect(columns).toContain("last_activity");
        });

        test("lists table has unique name index after migration", () => {
            runMigrations(db);
            const indexes = db
                .query<{ name: string }, []>(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='lists'"
                )
                .all()
                .map((i) => i.name);
            expect(indexes).toContain("idx_lists_name_unique");
        });
    });

    describe("rollbackMigration", () => {
        test("rolls back the latest migration", () => {
            runMigrations(db);
            const before = getAppliedMigrations(db);
            const rolledBack = rollbackMigration(db);

            expect(rolledBack).toBe(SCHEMA_VERSION);
            const after = getAppliedMigrations(db);
            expect(after.length).toBe(before.length - 1);
        });

        test("returns null when no migrations to rollback", () => {
            db.exec(CREATE_TABLES);
            const result = rollbackMigration(db);
            expect(result).toBeNull();
        });

        test("returns null when schema_version table does not exist", () => {
            const result = rollbackMigration(db);
            expect(result).toBeNull();
        });
    });

    describe("getAppliedMigrations", () => {
        test("returns empty array when no schema table", () => {
            const result = getAppliedMigrations(db);
            expect(result).toEqual([]);
        });

        test("returns applied migrations after running", () => {
            runMigrations(db);
            const result = getAppliedMigrations(db);
            expect(result.length).toBe(SCHEMA_VERSION);
            expect(result[0]?.version).toBe(1);
        });

        test("each migration has an applied_at timestamp", () => {
            runMigrations(db);
            const result = getAppliedMigrations(db);
            for (const migration of result) {
                expect(migration.applied_at).toBeDefined();
                expect(typeof migration.applied_at).toBe("string");
            }
        });
    });

    describe("cleanupExpiredSessions", () => {
        test("removes expired sessions", () => {
            runMigrations(db);

            db.query("INSERT INTO sessions (token, expires_at) VALUES (?, datetime('now', '-1 hour'))").run("expired-token");
            db.query("INSERT INTO sessions (token, expires_at) VALUES (?, datetime('now', '+1 hour'))").run("valid-token");

            const deleted = cleanupExpiredSessions(db);
            expect(deleted).toBe(1);

            const remaining = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM sessions").get();
            expect(remaining?.count).toBe(1);
        });

        test("returns 0 when no expired sessions", () => {
            runMigrations(db);
            db.query("INSERT INTO sessions (token, expires_at) VALUES (?, datetime('now', '+1 hour'))").run("valid-token");

            const deleted = cleanupExpiredSessions(db);
            expect(deleted).toBe(0);
        });
    });

    describe("cleanupExpiredRateLimits", () => {
        test("removes expired rate limit entries", () => {
            runMigrations(db);

            db.query("INSERT INTO rate_limits (ip, attempts, locked_until) VALUES (?, 5, datetime('now', '-1 hour'))").run("1.2.3.4");
            db.query("INSERT INTO rate_limits (ip, attempts, locked_until) VALUES (?, 3, datetime('now', '+1 hour'))").run("5.6.7.8");

            const deleted = cleanupExpiredRateLimits(db);
            expect(deleted).toBe(1);

            const remaining = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM rate_limits").get();
            expect(remaining?.count).toBe(1);
        });

        test("does not remove entries without locked_until", () => {
            runMigrations(db);

            db.query("INSERT INTO rate_limits (ip, attempts) VALUES (?, 2)").run("1.2.3.4");

            const deleted = cleanupExpiredRateLimits(db);
            expect(deleted).toBe(0);
        });
    });

    describe("Query Performance", () => {
        test("indexed queries are faster than full table scans", () => {
            runMigrations(db);

            const list = db.query<{ id: number }, []>("INSERT INTO lists (name, sort_order) VALUES ('Perf List', 1) RETURNING id").get();
            const section = db.query<{ id: number }, []>(`INSERT INTO sections (list_id, name, sort_order) VALUES (${list!.id}, 'Perf Section', 1) RETURNING id`).get();

            for (let i = 0; i < 100; i++) {
                db.query("INSERT INTO items (section_id, name, sort_order) VALUES (?, ?, ?)").run(section!.id, `Item ${i}`, i);
            }

            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                db.query("SELECT * FROM items WHERE section_id = ?").all(section!.id);
            }
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(1000);
        });
    });
});
