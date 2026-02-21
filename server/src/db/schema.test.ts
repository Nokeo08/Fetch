import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { CREATE_TABLES, CREATE_INDEXES, SCHEMA_VERSION } from "./schema";
import { runMigrations, rollbackMigration, getAppliedMigrations } from "./migrations";

describe("Database Schema", () => {
    let db: Database;

    beforeEach(() => {
        db = new Database(":memory:");
    });

    afterEach(() => {
        db.close();
    });

    describe("Table Creation", () => {
        test("should create all required tables", () => {
            db.exec(CREATE_TABLES);

            const tables = db
                .query<{ name: string }, []>(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                )
                .all();

            const tableNames = tables.map((t) => t.name);
            expect(tableNames).toContain("schema_version");
            expect(tableNames).toContain("sessions");
            expect(tableNames).toContain("lists");
            expect(tableNames).toContain("sections");
            expect(tableNames).toContain("items");
            expect(tableNames).toContain("history");
            expect(tableNames).toContain("templates");
            expect(tableNames).toContain("template_items");
            expect(tableNames).toContain("rate_limits");
        });

        test("should create all required indexes", () => {
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            const indexes = db
                .query<{ name: string }, []>(
                    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
                )
                .all();

            const indexNames = indexes.map((i) => i.name);
            expect(indexNames).toContain("idx_sections_list_id");
            expect(indexNames).toContain("idx_items_section_id");
            expect(indexNames).toContain("idx_template_items_template_id");
            expect(indexNames).toContain("idx_sessions_expires_at");
            expect(indexNames).toContain("idx_lists_is_active");
        });
    });

    describe("Schema Version", () => {
        test("should track schema version", () => {
            runMigrations(db);

            const migrations = getAppliedMigrations(db);
            expect(migrations).toHaveLength(1);
            expect(migrations[0].version).toBe(SCHEMA_VERSION);
        });
    });

    describe("Foreign Keys", () => {
        test("should enable foreign keys", () => {
            db.exec(CREATE_TABLES);
            db.exec("PRAGMA foreign_keys = ON;");

            const result = db.query<{ foreign_keys: number }, []>("PRAGMA foreign_keys").get();
            expect(result?.foreign_keys).toBe(1);
        });

        test("should cascade delete sections when list is deleted", () => {
            db.exec(CREATE_TABLES);
            db.exec("PRAGMA foreign_keys = ON;");

            db.query("INSERT INTO lists (name) VALUES ('Test List')").run();
            db.query("INSERT INTO sections (list_id, name) VALUES (1, 'Section 1')").run();

            db.query("DELETE FROM lists WHERE id = 1").run();

            const sections = db.query("SELECT * FROM sections").all();
            expect(sections).toHaveLength(0);
        });

        test("should cascade delete items when section is deleted", () => {
            db.exec(CREATE_TABLES);
            db.exec("PRAGMA foreign_keys = ON;");

            db.query("INSERT INTO lists (name) VALUES ('Test List')").run();
            db.query("INSERT INTO sections (list_id, name) VALUES (1, 'Section 1')").run();
            db.query("INSERT INTO items (section_id, name) VALUES (1, 'Item 1')").run();

            db.query("DELETE FROM sections WHERE id = 1").run();

            const items = db.query("SELECT * FROM items").all();
            expect(items).toHaveLength(0);
        });

        test("should cascade delete template items when template is deleted", () => {
            db.exec(CREATE_TABLES);
            db.exec("PRAGMA foreign_keys = ON;");

            db.query("INSERT INTO templates (name) VALUES ('Template 1')").run();
            db.query("INSERT INTO template_items (template_id, name) VALUES (1, 'Item 1')").run();

            db.query("DELETE FROM templates WHERE id = 1").run();

            const items = db.query("SELECT * FROM template_items").all();
            expect(items).toHaveLength(0);
        });
    });

    describe("Table Structure", () => {
        beforeEach(() => {
            db.exec(CREATE_TABLES);
        });

        test("sessions table should have correct columns", () => {
            const columns = db.query<{ name: string; type: string }, []>("PRAGMA table_info(sessions)").all();
            const columnNames = columns.map((c) => c.name);

            expect(columnNames).toContain("token");
            expect(columnNames).toContain("created_at");
            expect(columnNames).toContain("expires_at");
        });

        test("lists table should have correct columns", () => {
            const columns = db.query<{ name: string; type: string }, []>("PRAGMA table_info(lists)").all();
            const columnNames = columns.map((c) => c.name);

            expect(columnNames).toContain("id");
            expect(columnNames).toContain("name");
            expect(columnNames).toContain("icon");
            expect(columnNames).toContain("sort_order");
            expect(columnNames).toContain("is_active");
            expect(columnNames).toContain("created_at");
        });

        test("items table should have correct columns", () => {
            const columns = db.query<{ name: string; type: string }, []>("PRAGMA table_info(items)").all();
            const columnNames = columns.map((c) => c.name);

            expect(columnNames).toContain("id");
            expect(columnNames).toContain("section_id");
            expect(columnNames).toContain("name");
            expect(columnNames).toContain("description");
            expect(columnNames).toContain("quantity");
            expect(columnNames).toContain("status");
            expect(columnNames).toContain("sort_order");
            expect(columnNames).toContain("created_at");
            expect(columnNames).toContain("updated_at");
        });

        test("history table should have unique constraint on name", () => {
            db.query("INSERT INTO history (name) VALUES ('Milk')").run();

            expect(() => {
                db.query("INSERT INTO history (name) VALUES ('Milk')").run();
            }).toThrow();
        });
    });

    describe("Rollback", () => {
        test("should support migration rollback", () => {
            runMigrations(db);

            const versionBefore = getAppliedMigrations(db);
            expect(versionBefore[0].version).toBe(SCHEMA_VERSION);

            const rolledBack = rollbackMigration(db);
            expect(rolledBack).toBe(SCHEMA_VERSION);

            const migrations = getAppliedMigrations(db);
            expect(migrations).toHaveLength(0);
        });

        test("should return null when no migrations to rollback", () => {
            const result = rollbackMigration(db);
            expect(result).toBeNull();
        });
    });

    describe("Idempotency", () => {
        test("should be safe to run migrations multiple times", () => {
            runMigrations(db);
            runMigrations(db);
            runMigrations(db);

            const migrations = getAppliedMigrations(db);
            expect(migrations).toHaveLength(1);
        });
    });
});
