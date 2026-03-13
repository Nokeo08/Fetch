import { describe, test, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createDatabase, closeDatabase, withTransaction, DatabaseError } from "./client";
import { CREATE_TABLES, CREATE_INDEXES } from "./schema";

describe("Database Client", () => {
    let db: Database;

    afterEach(() => {
        try {
            db?.close();
        } catch {
            // already closed
        }
    });

    describe("createDatabase", () => {
        test("creates an in-memory database", () => {
            db = createDatabase(":memory:");
            expect(db).toBeDefined();
            const result = db.query<{ result: number }, []>("SELECT 1 as result").get();
            expect(result?.result).toBe(1);
        });

        test("configures journal mode", () => {
            db = createDatabase(":memory:");
            const result = db.query<{ journal_mode: string }, []>("PRAGMA journal_mode").get();
            expect(result?.journal_mode).toBeDefined();
        });

        test("enables foreign keys", () => {
            db = createDatabase(":memory:");
            const result = db.query<{ foreign_keys: number }, []>("PRAGMA foreign_keys").get();
            expect(result?.foreign_keys).toBe(1);
        });

        test("accepts config object", () => {
            db = createDatabase({ path: ":memory:", busyTimeout: 3000 });
            expect(db).toBeDefined();
            const result = db.query<{ result: number }, []>("SELECT 1 as result").get();
            expect(result?.result).toBe(1);
        });

        test("sets busy timeout from config", () => {
            db = createDatabase({ path: ":memory:", busyTimeout: 3000 });
            const result = db.query<{ timeout: number }, []>("PRAGMA busy_timeout").get();
            expect(result?.timeout).toBe(3000);
        });
    });

    describe("closeDatabase", () => {
        test("closes an open database", () => {
            db = createDatabase(":memory:");
            closeDatabase(db);
            expect(() => db.query("SELECT 1").get()).toThrow();
        });
    });

    describe("withTransaction", () => {
        test("commits on success", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            withTransaction(db, () => {
                db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("List 1", 1);
                db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("List 2", 2);
            });

            const count = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM lists").get();
            expect(count?.count).toBe(2);
        });

        test("rolls back on error", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            try {
                withTransaction(db, () => {
                    db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("List 1", 1);
                    throw new Error("Intentional failure");
                });
            } catch {
                // expected
            }

            const count = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM lists").get();
            expect(count?.count).toBe(0);
        });

        test("throws DatabaseError on failure", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);

            try {
                withTransaction(db, () => {
                    throw new Error("Test error");
                });
            } catch (err) {
                expect(err).toBeInstanceOf(DatabaseError);
                expect((err as DatabaseError).code).toBe("TRANSACTION_FAILED");
            }
        });

        test("returns value from successful transaction", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            const result = withTransaction(db, () => {
                db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("List 1", 1);
                return "success";
            });

            expect(result).toBe("success");
        });
    });

    describe("DatabaseError", () => {
        test("has correct name", () => {
            const err = new DatabaseError("test");
            expect(err.name).toBe("DatabaseError");
        });

        test("stores cause", () => {
            const cause = new Error("original");
            const err = new DatabaseError("wrapper", cause);
            expect(err.cause).toBe(cause);
        });

        test("stores code", () => {
            const err = new DatabaseError("test", undefined, "TEST_CODE");
            expect(err.code).toBe("TEST_CODE");
        });
    });

    describe("Connection Tests", () => {
        test("can execute queries after connection", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("Test", 1);
            const result = db.query<{ name: string }, []>("SELECT name FROM lists LIMIT 1").get();
            expect(result?.name).toBe("Test");
        });

        test("foreign key constraints are enforced", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            expect(() => {
                db.query("INSERT INTO sections (list_id, name, sort_order) VALUES (?, ?, ?)").run(999, "Section", 1);
            }).toThrow();
        });

        test("CASCADE delete works through foreign keys", () => {
            db = createDatabase(":memory:");
            db.exec(CREATE_TABLES);
            db.exec(CREATE_INDEXES);

            db.query("INSERT INTO lists (name, sort_order) VALUES (?, ?)").run("List 1", 1);
            const list = db.query<{ id: number }, []>("SELECT id FROM lists LIMIT 1").get();
            db.query("INSERT INTO sections (list_id, name, sort_order) VALUES (?, ?, ?)").run(list!.id, "Section 1", 1);
            const section = db.query<{ id: number }, []>("SELECT id FROM sections LIMIT 1").get();
            db.query("INSERT INTO items (section_id, name, sort_order) VALUES (?, ?, ?)").run(section!.id, "Item 1", 1);

            db.query("DELETE FROM lists WHERE id = ?").run(list!.id);

            const sectionCount = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM sections").get();
            const itemCount = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM items").get();
            expect(sectionCount?.count).toBe(0);
            expect(itemCount?.count).toBe(0);
        });
    });
});
