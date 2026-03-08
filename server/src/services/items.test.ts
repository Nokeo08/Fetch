import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createItemsService } from "./items";
import { createSectionsService } from "./sections";
import { createListsService } from "./lists";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("ItemsService", () => {
    let db: Database;
    let itemsService: ReturnType<typeof createItemsService>;
    let sectionsService: ReturnType<typeof createSectionsService>;
    let listsService: ReturnType<typeof createListsService>;
    let testSectionId: number;

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        itemsService = createItemsService(db);
        sectionsService = createSectionsService(db);
        listsService = createListsService(db);
        const list = listsService.create("Test List");
        const section = sectionsService.create(list.id, "Test Section");
        testSectionId = section.id;
    });

    afterEach(() => {
        db.close();
    });

    describe("create", () => {
        test("should create an item with required fields", () => {
            const item = itemsService.create(testSectionId, "Milk");
            expect(item.name).toBe("Milk");
            expect(item.status).toBe("active");
        });

        test("should create an item with optional fields", () => {
            const item = itemsService.create(testSectionId, "Eggs", "Free range", "12");
            expect(item.description).toBe("Free range");
            expect(item.quantity).toBe("12");
        });

        test("should update history on create", () => {
            itemsService.create(testSectionId, "Bread");
            const history = itemsService.getHistory();
            expect(history.some((h) => h.name === "Bread")).toBe(true);
        });
    });

    describe("update", () => {
        test("should update item status", () => {
            const item = itemsService.create(testSectionId, "Test Item");
            const updated = itemsService.update(item.id, { status: "completed" });
            expect(updated?.status).toBe("completed");
        });

        test("should update item to uncertain status", () => {
            const item = itemsService.create(testSectionId, "Test Item");
            const updated = itemsService.update(item.id, { status: "uncertain" });
            expect(updated?.status).toBe("uncertain");
        });

        test("should update item name and quantity", () => {
            const item = itemsService.create(testSectionId, "Test Item");
            const updated = itemsService.update(item.id, { name: "Updated Name", quantity: "5 lbs" });
            expect(updated?.name).toBe("Updated Name");
            expect(updated?.quantity).toBe("5 lbs");
        });

        test("should return null for non-existent item", () => {
            const result = itemsService.update(999, { status: "completed" });
            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        test("should delete item", () => {
            const item = itemsService.create(testSectionId, "To Delete");
            const result = itemsService.delete(item.id);
            expect(result).toBe(true);
            expect(itemsService.getById(item.id)).toBeNull();
        });
    });

    describe("deleteCompletedInSection", () => {
        test("should delete only completed items in section", () => {
            const item1 = itemsService.create(testSectionId, "Active Item");
            const item2 = itemsService.create(testSectionId, "Completed Item");
            itemsService.update(item2.id, { status: "completed" });

            const count = itemsService.deleteCompletedInSection(testSectionId);

            expect(count).toBe(1);
            expect(itemsService.getById(item1.id)).not.toBeNull();
            expect(itemsService.getById(item2.id)).toBeNull();
        });

        test("should return 0 if no completed items", () => {
            itemsService.create(testSectionId, "Active Item 1");
            itemsService.create(testSectionId, "Active Item 2");

            const count = itemsService.deleteCompletedInSection(testSectionId);

            expect(count).toBe(0);
        });
    });

    describe("moveToSection", () => {
        test("should move item to another section", () => {
            const item = itemsService.create(testSectionId, "Milk");
            const newSection = sectionsService.create(listsService.getAll()[0].id, "Another Section");
            const moved = itemsService.moveToSection(item.id, newSection.id);
            expect(moved?.sectionId).toBe(newSection.id);
        });
    });

    describe("reorder", () => {
        test("should reorder items", () => {
            const item1 = itemsService.create(testSectionId, "Item 1");
            const item2 = itemsService.create(testSectionId, "Item 2");
            const item3 = itemsService.create(testSectionId, "Item 3");

            itemsService.reorder([item3.id, item1.id, item2.id]);

            const items = sectionsService.getItems(testSectionId);
            expect(items[0].id).toBe(item3.id);
            expect(items[1].id).toBe(item1.id);
            expect(items[2].id).toBe(item2.id);
        });
    });

    describe("history", () => {
        test("should return history sorted by frequency", () => {
            itemsService.create(testSectionId, "Milk");
            itemsService.create(testSectionId, "Bread");
            itemsService.create(testSectionId, "Milk");

            const history = itemsService.getHistory();
            const milkEntry = history.find((h) => h.name === "Milk");
            const breadEntry = history.find((h) => h.name === "Bread");
            expect(milkEntry?.frequency).toBe(2);
            expect(breadEntry?.frequency).toBe(1);
        });

        test("should search history with substring match", () => {
            itemsService.create(testSectionId, "Whole Milk");
            itemsService.create(testSectionId, "Skim Milk");
            itemsService.create(testSectionId, "Bread");

            const results = itemsService.searchHistory("milk");
            expect(results.length).toBe(2);
        });

        test("should return empty for short queries", () => {
            itemsService.create(testSectionId, "Milk");
            itemsService.create(testSectionId, "Bread");

            expect(itemsService.searchHistory("m").length).toBe(0);
            expect(itemsService.searchHistory("").length).toBe(0);
        });

        test("should search history with fuzzy matching", () => {
            itemsService.create(testSectionId, "Milk");
            itemsService.create(testSectionId, "Bread");
            itemsService.create(testSectionId, "Mil");

            const results = itemsService.searchHistory("mil");
            expect(results.length).toBe(2);
            expect(results[0]?.name).toBe("Milk");
        });

        test("should rank results by frequency when scores are equal", () => {
            itemsService.create(testSectionId, "Low Freq");
            itemsService.create(testSectionId, "High Freq");
            itemsService.create(testSectionId, "High Freq");
            itemsService.create(testSectionId, "High Freq");
            itemsService.create(testSectionId, "Low Freq");

            const results = itemsService.searchHistory(" Freq");
            expect(results[0]?.name).toBe("High Freq");
            expect(results[0]?.frequency).toBe(3);
        });

        test("should normalize special characters", () => {
            itemsService.create(testSectionId, "Café");
            itemsService.create(testSectionId, "Cafe");

            const results = itemsService.searchHistory("cafe");
            expect(results.length).toBe(2);
        });

        test("should limit results", () => {
            itemsService.create(testSectionId, "Item 1");
            itemsService.create(testSectionId, "Item 2");
            itemsService.create(testSectionId, "Item 3");
            itemsService.create(testSectionId, "Item 4");
            itemsService.create(testSectionId, "Item 5");
            itemsService.create(testSectionId, "Item 6");

            const results = itemsService.searchHistory("Item", 3);
            expect(results.length).toBe(3);
        });

        test("should delete a history entry by ID", () => {
            itemsService.create(testSectionId, "Deletable Entry");
            const history = itemsService.getHistory(100);
            const entry = history.find((h) => h.name === "Deletable Entry");
            expect(entry).toBeDefined();

            const deleted = itemsService.deleteHistoryEntry(entry!.id);
            expect(deleted).toBe(true);

            const historyAfter = itemsService.getHistory(100);
            expect(historyAfter.some((h) => h.name === "Deletable Entry")).toBe(false);
        });

        test("should return false when deleting non-existent history entry", () => {
            const deleted = itemsService.deleteHistoryEntry(99999);
            expect(deleted).toBe(false);
        });
    });
});
