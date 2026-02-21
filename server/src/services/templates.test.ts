import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTemplatesService } from "./templates";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("TemplatesService", () => {
    let db: Database;
    let templatesService: ReturnType<typeof createTemplatesService>;

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        db.exec("PRAGMA foreign_keys = ON;");
        templatesService = createTemplatesService(db);
    });

    afterEach(() => {
        db.close();
    });

    describe("create", () => {
        test("should create a template", () => {
            const template = templatesService.create("Weekly Groceries");
            expect(template.name).toBe("Weekly Groceries");
            expect(template.id).toBeDefined();
            expect(template.createdAt).toBeDefined();
        });
    });

    describe("getAll", () => {
        test("should return all templates sorted by name", () => {
            templatesService.create("Weekly");
            templatesService.create("Monthly");
            templatesService.create("Daily");

            const templates = templatesService.getAll();
            expect(templates).toHaveLength(3);
            expect(templates[0].name).toBe("Daily");
            expect(templates[1].name).toBe("Monthly");
            expect(templates[2].name).toBe("Weekly");
        });

        test("should return empty array when no templates", () => {
            const templates = templatesService.getAll();
            expect(templates).toHaveLength(0);
        });
    });

    describe("getById", () => {
        test("should return template by id", () => {
            const created = templatesService.create("Test Template");
            const found = templatesService.getById(created.id);
            expect(found?.name).toBe("Test Template");
        });

        test("should return null for non-existent template", () => {
            const found = templatesService.getById(999);
            expect(found).toBeNull();
        });
    });

    describe("update", () => {
        test("should update template name", () => {
            const template = templatesService.create("Original");
            const updated = templatesService.update(template.id, "Updated");
            expect(updated?.name).toBe("Updated");
        });

        test("should return null for non-existent template", () => {
            const result = templatesService.update(999, "Test");
            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        test("should delete template", () => {
            const template = templatesService.create("To Delete");
            const result = templatesService.delete(template.id);
            expect(result).toBe(true);
            expect(templatesService.getById(template.id)).toBeNull();
        });

        test("should cascade delete template items", () => {
            const template = templatesService.create("Test");
            templatesService.addItem(template.id, "Milk");
            templatesService.addItem(template.id, "Bread");

            const itemsBeforeDelete = db.query("SELECT COUNT(*) as count FROM template_items").get() as { count: number };
            expect(itemsBeforeDelete.count).toBe(2);

            templatesService.delete(template.id);

            const itemsAfterDelete = db.query("SELECT COUNT(*) as count FROM template_items").get() as { count: number };
            expect(itemsAfterDelete.count).toBe(0);
        });
    });

    describe("addItem", () => {
        test("should add item to template", () => {
            const template = templatesService.create("Weekly");
            const item = templatesService.addItem(template.id, "Milk");

            expect(item.name).toBe("Milk");
            expect(item.templateId).toBe(template.id);
        });

        test("should add item with all options", () => {
            const template = templatesService.create("Weekly");
            const item = templatesService.addItem(template.id, "Eggs", {
                description: "Free range",
                quantity: "12",
                sectionName: "Dairy",
            });

            expect(item.description).toBe("Free range");
            expect(item.quantity).toBe("12");
            expect(item.sectionName).toBe("Dairy");
        });

        test("should set sort_order incrementally", () => {
            const template = templatesService.create("Weekly");
            const item1 = templatesService.addItem(template.id, "Item 1");
            const item2 = templatesService.addItem(template.id, "Item 2");

            expect(item2.sortOrder).toBeGreaterThan(item1.sortOrder);
        });
    });

    describe("getItems", () => {
        test("should return items sorted by sort_order", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Bread");
            templatesService.addItem(template.id, "Milk");
            templatesService.addItem(template.id, "Eggs");

            const items = templatesService.getItems(template.id);
            expect(items).toHaveLength(3);
            expect(items[0].name).toBe("Bread");
            expect(items[1].name).toBe("Milk");
            expect(items[2].name).toBe("Eggs");
        });
    });

    describe("updateItem", () => {
        test("should update item", () => {
            const template = templatesService.create("Weekly");
            const item = templatesService.addItem(template.id, "Milk");

            const updated = templatesService.updateItem(item.id, {
                name: "Oat Milk",
                quantity: "1 liter",
            });

            expect(updated?.name).toBe("Oat Milk");
            expect(updated?.quantity).toBe("1 liter");
        });
    });

    describe("deleteItem", () => {
        test("should delete item", () => {
            const template = templatesService.create("Weekly");
            const item = templatesService.addItem(template.id, "Milk");

            const result = templatesService.deleteItem(item.id);
            expect(result).toBe(true);

            const items = templatesService.getItems(template.id);
            expect(items).toHaveLength(0);
        });
    });

    describe("reorderItems", () => {
        test("should reorder items", () => {
            const template = templatesService.create("Weekly");
            const item1 = templatesService.addItem(template.id, "Item 1");
            const item2 = templatesService.addItem(template.id, "Item 2");
            const item3 = templatesService.addItem(template.id, "Item 3");

            templatesService.reorderItems(template.id, [item3.id, item1.id, item2.id]);

            const items = templatesService.getItems(template.id);
            expect(items[0].id).toBe(item3.id);
            expect(items[1].id).toBe(item1.id);
            expect(items[2].id).toBe(item2.id);
        });
    });

    describe("getByIdWithItems", () => {
        test("should return template with items", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk");
            templatesService.addItem(template.id, "Bread");

            const result = templatesService.getByIdWithItems(template.id);
            expect(result?.items).toHaveLength(2);
        });
    });

    describe("getAllWithItems", () => {
        test("should return all templates with items", () => {
            const template1 = templatesService.create("Weekly");
            const template2 = templatesService.create("Monthly");
            templatesService.addItem(template1.id, "Milk");
            templatesService.addItem(template2.id, "Bread");

            const results = templatesService.getAllWithItems();
            expect(results).toHaveLength(2);
            expect(results[0].items).toHaveLength(1);
            expect(results[1].items).toHaveLength(1);
        });
    });
});
