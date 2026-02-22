import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTemplatesService, type SectionWithItems } from "./templates";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";
import type { Section, Item } from "shared/dist";

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

    describe("applyToList", () => {
        test("should throw error for non-existent template", () => {
            const mockSections: SectionWithItems[] = [];
            const mockCreateSection = (name: string): Section => ({
                id: 1,
                listId: 1,
                name,
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            });
            const mockCreateItem = (sectionId: number, name: string): Item => ({
                id: 1,
                sectionId,
                name,
                description: null,
                quantity: null,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            expect(() => templatesService.applyToList(999, mockSections, mockCreateSection, mockCreateItem)).toThrow("Template not found");
        });

        test("should add items from template to empty list", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk");
            templatesService.addItem(template.id, "Bread");

            const mockSections: SectionWithItems[] = [];
            let sectionIdCounter = 0;
            let itemIdCounter = 0;

            const mockCreateSection = (name: string): Section => ({
                id: ++sectionIdCounter,
                listId: 1,
                name,
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            });

            const mockCreateItem = (sectionId: number, name: string): Item => ({
                id: ++itemIdCounter,
                sectionId,
                name,
                description: null,
                quantity: null,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            const result = templatesService.applyToList(template.id, mockSections, mockCreateSection, mockCreateItem);

            expect(result.added).toBe(2);
            expect(result.skipped).toHaveLength(0);
        });

        test("should skip duplicate items", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk");
            templatesService.addItem(template.id, "Bread");

            const existingSection: Section = {
                id: 1,
                listId: 1,
                name: "Dairy",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            };

            const existingItem: Item = {
                id: 1,
                sectionId: 1,
                name: "Milk",
                description: null,
                quantity: null,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const mockSections: SectionWithItems[] = [
                { ...existingSection, items: [existingItem] },
            ];

            let sectionIdCounter = 1;
            let itemIdCounter = 1;

            const mockCreateSection = (name: string): Section => ({
                id: ++sectionIdCounter,
                listId: 1,
                name,
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            });

            const mockCreateItem = (sectionId: number, name: string): Item => ({
                id: ++itemIdCounter,
                sectionId,
                name,
                description: null,
                quantity: null,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            const result = templatesService.applyToList(template.id, mockSections, mockCreateSection, mockCreateItem);

            expect(result.added).toBe(1);
            expect(result.skipped).toEqual(["Milk"]);
        });

        test("should use existing section when sectionName matches", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk", { sectionName: "Dairy" });

            const existingSection: Section = {
                id: 1,
                listId: 1,
                name: "Dairy",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            };

            const mockSections: SectionWithItems[] = [
                { ...existingSection, items: [] },
            ];

            let sectionCreated = false;
            let itemCreated = false;

            const mockCreateSection = (name: string): Section => {
                sectionCreated = true;
                return {
                    id: 2,
                    listId: 1,
                    name,
                    sortOrder: 0,
                    createdAt: new Date().toISOString(),
                };
            };

            const mockCreateItem = (sectionId: number, name: string): Item => {
                itemCreated = true;
                expect(sectionId).toBe(1);
                return {
                    id: 1,
                    sectionId,
                    name,
                    description: null,
                    quantity: null,
                    status: "active",
                    sortOrder: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            };

            templatesService.applyToList(template.id, mockSections, mockCreateSection, mockCreateItem);

            expect(sectionCreated).toBe(false);
            expect(itemCreated).toBe(true);
        });

        test("should create new section when sectionName does not exist", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk", { sectionName: "Dairy" });

            const existingSection: Section = {
                id: 1,
                listId: 1,
                name: "Produce",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            };

            const mockSections: SectionWithItems[] = [
                { ...existingSection, items: [] },
            ];

            let newSectionId = 0;
            let newSectionName = "";

            const mockCreateSection = (name: string): Section => {
                newSectionName = name;
                newSectionId = 2;
                return {
                    id: 2,
                    listId: 1,
                    name,
                    sortOrder: 0,
                    createdAt: new Date().toISOString(),
                };
            };

            const mockCreateItem = (sectionId: number, name: string): Item => {
                expect(sectionId).toBe(2);
                return {
                    id: 1,
                    sectionId,
                    name,
                    description: null,
                    quantity: null,
                    status: "active",
                    sortOrder: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            };

            templatesService.applyToList(template.id, mockSections, mockCreateSection, mockCreateItem);

            expect(newSectionName).toBe("Dairy");
        });

        test("should apply only selected items when selectedItemIds provided", () => {
            const template = templatesService.create("Weekly");
            const item1 = templatesService.addItem(template.id, "Milk");
            const item2 = templatesService.addItem(template.id, "Bread");
            templatesService.addItem(template.id, "Eggs");

            const mockSections: SectionWithItems[] = [];
            let itemCounter = 0;

            const mockCreateSection = (name: string): Section => ({
                id: 1,
                listId: 1,
                name,
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            });

            const mockCreateItem = (sectionId: number, name: string): Item => ({
                id: ++itemCounter,
                sectionId,
                name,
                description: null,
                quantity: null,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            const result = templatesService.applyToList(
                template.id,
                mockSections,
                mockCreateSection,
                mockCreateItem,
                [item1.id, item2.id]
            );

            expect(result.added).toBe(2);
        });

        test("should copy description and quantity from template item", () => {
            const template = templatesService.create("Weekly");
            templatesService.addItem(template.id, "Milk", {
                description: "Organic whole milk",
                quantity: "1 gallon",
            });

            const mockSections: SectionWithItems[] = [];
            let createdItem: Item | null = null;

            const mockCreateSection = (name: string): Section => ({
                id: 1,
                listId: 1,
                name,
                sortOrder: 0,
                createdAt: new Date().toISOString(),
            });

            const mockCreateItem = (sectionId: number, name: string, description?: string, quantity?: string): Item => {
                createdItem = {
                    id: 1,
                    sectionId,
                    name,
                    description: description || null,
                    quantity: quantity || null,
                    status: "active",
                    sortOrder: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                return createdItem;
            };

            templatesService.applyToList(template.id, mockSections, mockCreateSection, mockCreateItem);

            expect(createdItem).not.toBeNull();
            expect(createdItem!.name).toBe("Milk");
            expect(createdItem!.description).toBe("Organic whole milk");
            expect(createdItem!.quantity).toBe("1 gallon");
        });
    });

    describe("createFromSections", () => {
        test("should create template from sections with items", () => {
            const section1: SectionWithItems = {
                id: 1,
                listId: 1,
                name: "Dairy",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                items: [
                    {
                        id: 1,
                        sectionId: 1,
                        name: "Milk",
                        description: "Organic",
                        quantity: "1 gallon",
                        status: "active",
                        sortOrder: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        sectionId: 1,
                        name: "Cheese",
                        description: null,
                        quantity: null,
                        status: "active",
                        sortOrder: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
            };

            const section2: SectionWithItems = {
                id: 2,
                listId: 1,
                name: "Produce",
                sortOrder: 1,
                createdAt: new Date().toISOString(),
                items: [
                    {
                        id: 3,
                        sectionId: 2,
                        name: "Apples",
                        description: null,
                        quantity: "6",
                        status: "active",
                        sortOrder: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
            };

            const template = templatesService.createFromSections("Weekly Groceries", [section1, section2]);

            expect(template.name).toBe("Weekly Groceries");
            expect(template.items).toHaveLength(3);

            const milkItem = template.items.find((i) => i.name === "Milk");
            expect(milkItem?.description).toBe("Organic");
            expect(milkItem?.quantity).toBe("1 gallon");
            expect(milkItem?.sectionName).toBe("Dairy");

            const applesItem = template.items.find((i) => i.name === "Apples");
            expect(applesItem?.quantity).toBe("6");
            expect(applesItem?.sectionName).toBe("Produce");
        });

        test("should create template from empty sections", () => {
            const template = templatesService.createFromSections("Empty Template", []);

            expect(template.name).toBe("Empty Template");
            expect(template.items).toHaveLength(0);
        });

        test("should preserve item order from sections", () => {
            const section: SectionWithItems = {
                id: 1,
                listId: 1,
                name: "Items",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                items: [
                    {
                        id: 1,
                        sectionId: 1,
                        name: "First",
                        description: null,
                        quantity: null,
                        status: "active",
                        sortOrder: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        sectionId: 1,
                        name: "Second",
                        description: null,
                        quantity: null,
                        status: "active",
                        sortOrder: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: 3,
                        sectionId: 1,
                        name: "Third",
                        description: null,
                        quantity: null,
                        status: "active",
                        sortOrder: 2,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
            };

            const template = templatesService.createFromSections("Ordered", [section]);

            expect(template.items[0]?.name).toBe("First");
            expect(template.items[1]?.name).toBe("Second");
            expect(template.items[2]?.name).toBe("Third");
        });
    });
});
