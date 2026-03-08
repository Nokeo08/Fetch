import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";
import { createImportExportService, validateImportData } from "./import-export";

let db: Database;
let service: ReturnType<typeof createImportExportService>;

beforeAll(() => {
    db = new Database(":memory:");
    db.exec(CREATE_TABLES);
    db.exec(CREATE_INDEXES);
    service = createImportExportService(db);
});

afterAll(() => {
    db?.close();
});

describe("validateImportData", () => {
    test("rejects non-object input", () => {
        const result = validateImportData("not an object");
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects null input", () => {
        const result = validateImportData(null);
        expect(result.valid).toBe(false);
    });

    test("rejects missing version", () => {
        const result = validateImportData({
            exported_at: new Date().toISOString(),
            lists: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path === "version")).toBe(true);
    });

    test("rejects unsupported version", () => {
        const result = validateImportData({
            version: "99.0.0",
            exported_at: new Date().toISOString(),
            lists: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path === "version")).toBe(true);
    });

    test("rejects missing exported_at", () => {
        const result = validateImportData({
            version: "1.0.0",
            lists: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path === "exported_at")).toBe(true);
    });

    test("rejects missing lists", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path === "lists")).toBe(true);
    });

    test("accepts valid minimal data", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [],
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test("validates list structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{ sections: [] }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("lists[0].name"))).toBe(true);
    });

    test("validates section structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{
                name: "Test",
                sections: [{ items: [] }],
            }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("sections[0].name"))).toBe(true);
    });

    test("validates item structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{
                name: "Test",
                sections: [{
                    name: "Section",
                    items: [{ description: "no name" }],
                }],
            }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("items[0].name"))).toBe(true);
    });

    test("validates item status", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{
                name: "Test",
                sections: [{
                    name: "Section",
                    items: [{ name: "Item", status: "invalid_status" }],
                }],
            }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("items[0].status"))).toBe(true);
    });

    test("accepts valid item status values", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{
                name: "Test",
                sections: [{
                    name: "Section",
                    items: [
                        { name: "Item1", status: "active" },
                        { name: "Item2", status: "completed" },
                        { name: "Item3", status: "uncertain" },
                    ],
                }],
            }],
        });
        expect(result.valid).toBe(true);
    });

    test("validates template structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [],
            templates: [{ items: [] }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("templates[0].name"))).toBe(true);
    });

    test("validates template item structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [],
            templates: [{ name: "T", items: [{ description: "no name" }] }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("items[0].name"))).toBe(true);
    });

    test("validates history structure", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [],
            history: [{ frequency: 1 }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes("history[0].name"))).toBe(true);
    });

    test("accepts full valid data", () => {
        const result = validateImportData({
            version: "1.0.0",
            exported_at: new Date().toISOString(),
            lists: [{
                name: "My List",
                icon: "🛒",
                sections: [{
                    name: "Produce",
                    items: [{ name: "Apples", description: "Red", quantity: "5", status: "active" }],
                }],
            }],
            templates: [{
                name: "Weekly",
                items: [{ name: "Milk", description: null, quantity: "1 gal", sectionName: "Dairy" }],
            }],
            history: [{ name: "Eggs", sectionName: "Dairy", description: null, quantity: "1 dozen", frequency: 10 }],
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});

describe("createImportExportService", () => {
    describe("getExportSummary", () => {
        test("returns summary for empty database", () => {
            const summary = service.getExportSummary();
            expect(Array.isArray(summary.lists)).toBe(true);
            expect(Array.isArray(summary.templates)).toBe(true);
            expect(typeof summary.historyCount).toBe("number");
        });
    });

    describe("exportData", () => {
        test("returns correct structure when exporting all", () => {
            const data = service.exportData({ includeHistory: true });
            expect(data.version).toBe("1.0.0");
            expect(data.exported_at).toBeDefined();
            expect(Array.isArray(data.lists)).toBe(true);
            expect(Array.isArray(data.templates)).toBe(true);
            expect(Array.isArray(data.history)).toBe(true);
        });

        test("exports lists with sections and items", () => {
            db.exec("INSERT INTO lists (name, icon, sort_order) VALUES ('Test List', '📋', 0)");
            const listId = db.query<{ id: number }, []>("SELECT last_insert_rowid() as id").get()!.id;

            db.exec(`INSERT INTO sections (list_id, name, sort_order) VALUES (${listId}, 'Section A', 0)`);
            const sectionId = db.query<{ id: number }, []>("SELECT last_insert_rowid() as id").get()!.id;

            db.exec(`INSERT INTO items (section_id, name, description, quantity, status, sort_order) VALUES (${sectionId}, 'Item A', 'desc', '2', 'active', 0)`);

            const data = service.exportData({ includeHistory: true });
            const list = data.lists.find((l) => l.name === "Test List");
            expect(list).toBeDefined();
            expect(list!.sections).toHaveLength(1);
            expect(list!.sections[0]!.items).toHaveLength(1);
            expect(list!.sections[0]!.items[0]!.name).toBe("Item A");
            expect(list!.sections[0]!.items[0]!.description).toBe("desc");
        });

        test("exports only selected lists by ID", () => {
            db.exec("INSERT INTO lists (name, icon, sort_order) VALUES ('Export List', '📝', 10)");
            const listId = db.query<{ id: number }, []>("SELECT last_insert_rowid() as id").get()!.id;

            db.exec(`INSERT INTO sections (list_id, name, sort_order) VALUES (${listId}, 'Produce', 0)`);
            const sectionId = db.query<{ id: number }, []>("SELECT last_insert_rowid() as id").get()!.id;

            db.exec(`INSERT INTO items (section_id, name, description, quantity, status, sort_order) VALUES (${sectionId}, 'Bananas', '', '1 bunch', 'completed', 0)`);

            const data = service.exportData({ listIds: [listId], includeHistory: false });
            expect(data.lists).toHaveLength(1);
            expect(data.lists[0]!.name).toBe("Export List");
            expect(data.lists[0]!.sections).toHaveLength(1);
            expect(data.lists[0]!.sections[0]!.name).toBe("Produce");
            expect(data.lists[0]!.sections[0]!.items).toHaveLength(1);
            expect(data.lists[0]!.sections[0]!.items[0]!.name).toBe("Bananas");
        });

        test("returns empty lists when listIds is empty array", () => {
            const data = service.exportData({ listIds: [], includeHistory: false });
            expect(data.lists).toHaveLength(0);
        });

        test("excludes history when includeHistory is false", () => {
            const data = service.exportData({ includeHistory: false });
            expect(data.history).toHaveLength(0);
        });
    });

    describe("preview", () => {
        test("returns correct counts", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [
                    { name: "L1", icon: "📋", sections: [] },
                    { name: "L2", icon: "📋", sections: [] },
                ],
                templates: [{ name: "T1", items: [] }],
                history: [
                    { name: "H1", sectionName: null, description: null, quantity: null, frequency: 1 },
                    { name: "H2", sectionName: null, description: null, quantity: null, frequency: 1 },
                    { name: "H3", sectionName: null, description: null, quantity: null, frequency: 1 },
                ],
            };

            const preview = service.preview(data);
            expect(preview.listCount).toBe(2);
            expect(preview.templateCount).toBe(1);
            expect(preview.historyCount).toBe(3);
        });

        test("detects conflicts with existing data", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{ name: "Test List", icon: "📋", sections: [] }],
                templates: [],
                history: [],
            };

            const preview = service.preview(data);
            expect(preview.existingListConflicts).toContain("Test List");
        });
    });

    describe("importData", () => {
        test("imports lists in merge mode", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Imported List Unit",
                    icon: "🆕",
                    sections: [{
                        name: "Imported Sec",
                        items: [{ name: "Imported Item", description: "d", quantity: "q", status: "active" as const }],
                    }],
                }],
                templates: [],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(1);

            const list = db.query<{ id: number; name: string }, [string]>(
                "SELECT * FROM lists WHERE name = ?"
            ).get("Imported List Unit");
            expect(list).toBeDefined();
        });

        test("merges new sections into existing list in merge mode", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Imported List Unit",
                    icon: "📋",
                    sections: [{
                        name: "New Merge Section",
                        items: [{ name: "New Merge Item", description: "d", quantity: "1", status: "active" as const }],
                    }],
                }],
                templates: [],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(0);
            expect(result.listsMerged).toBe(1);

            const list = db.query<{ id: number }, [string]>(
                "SELECT id FROM lists WHERE name = ?"
            ).get("Imported List Unit");
            expect(list).toBeDefined();

            const sections = db.query<{ name: string }, [number]>(
                "SELECT name FROM sections WHERE list_id = ? ORDER BY sort_order"
            ).all(list!.id);
            expect(sections.some((s) => s.name === "New Merge Section")).toBe(true);

            const newSection = db.query<{ id: number }, [number, string]>(
                "SELECT id FROM sections WHERE list_id = ? AND name = ?"
            ).get(list!.id, "New Merge Section");
            const items = db.query<{ name: string }, [number]>(
                "SELECT name FROM items WHERE section_id = ?"
            ).all(newSection!.id);
            expect(items).toHaveLength(1);
            expect(items[0]!.name).toBe("New Merge Item");
        });

        test("merges new items into existing sections in merge mode", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Imported List Unit",
                    icon: "📋",
                    sections: [{
                        name: "Imported Sec",
                        items: [
                            { name: "Imported Item", description: "d", quantity: "q", status: "active" as const },
                            { name: "Brand New Item", description: null, quantity: null, status: "active" as const },
                        ],
                    }],
                }],
                templates: [],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(0);
            expect(result.listsMerged).toBe(1);
            expect(result.skipped.some((s) => s.includes("Imported Item") && s.includes("already exists"))).toBe(true);

            const list = db.query<{ id: number }, [string]>(
                "SELECT id FROM lists WHERE name = ?"
            ).get("Imported List Unit");
            const section = db.query<{ id: number }, [number, string]>(
                "SELECT id FROM sections WHERE list_id = ? AND name = ?"
            ).get(list!.id, "Imported Sec");
            const items = db.query<{ name: string }, [number]>(
                "SELECT name FROM items WHERE section_id = ? ORDER BY sort_order"
            ).all(section!.id);
            expect(items.some((i) => i.name === "Brand New Item")).toBe(true);
            expect(items.some((i) => i.name === "Imported Item")).toBe(true);
        });

        test("does not count as merged when no changes in merge mode", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Imported List Unit",
                    icon: "📋",
                    sections: [{
                        name: "Imported Sec",
                        items: [{ name: "Imported Item", description: "d", quantity: "q", status: "active" as const }],
                    }],
                }],
                templates: [],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(0);
            expect(result.listsMerged).toBe(0);
            expect(result.skipped.some((s) => s.includes("Imported Item") && s.includes("already exists"))).toBe(true);
        });

        test("replaces data in replace mode", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{ name: "Only List", icon: "🔄", sections: [] }],
                templates: [{ name: "Only Template", items: [] }],
                history: [{ name: "Only History", sectionName: null, description: null, quantity: null, frequency: 1 }],
            };

            const result = service.importData(data, {
                mode: "replace",
                importLists: true,
                importTemplates: true,
                importHistory: true,
            });

            expect(result.listsImported).toBe(1);
            expect(result.templatesImported).toBe(1);
            expect(result.historyImported).toBe(1);

            const lists = db.query<{ name: string }, []>("SELECT name FROM lists").all();
            expect(lists).toHaveLength(1);
            expect(lists[0]!.name).toBe("Only List");
        });

        test("respects selective import options", () => {
            db.exec("DELETE FROM lists");
            db.exec("DELETE FROM sections");
            db.exec("DELETE FROM items");

            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{ name: "Skip This List", icon: "📋", sections: [] }],
                templates: [{ name: "Import This Template", items: [] }],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: false,
                importTemplates: true,
                importHistory: false,
            });

            expect(result.listsImported).toBe(0);
            expect(result.templatesImported).toBe(1);

            const lists = db.query<{ name: string }, []>("SELECT name FROM lists WHERE name = 'Skip This List'").all();
            expect(lists).toHaveLength(0);
        });

        test("handles invalid status by defaulting to active", () => {
            const data = {
                version: "1.0.0" as const,
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Status Test List",
                    icon: "📋",
                    sections: [{
                        name: "Section",
                        items: [{ name: "Bad Status Item", description: null, quantity: null, status: "invalid" as "active" }],
                    }],
                }],
                templates: [],
                history: [],
            };

            const result = service.importData(data, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(1);

            const item = db.query<{ status: string }, [string]>(
                "SELECT i.status FROM items i JOIN sections s ON s.id = i.section_id JOIN lists l ON l.id = s.list_id WHERE l.name = ?"
            ).get("Status Test List");
            expect(item!.status).toBe("active");
        });
    });
});
