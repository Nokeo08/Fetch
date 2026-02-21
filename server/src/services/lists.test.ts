import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createListsService } from "./lists";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("ListsService", () => {
    let db: Database;
    let listsService: ReturnType<typeof createListsService>;

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        listsService = createListsService(db);
    });

    afterEach(() => {
        db.close();
    });

    describe("create", () => {
        test("should create a list with required fields", () => {
            const list = listsService.create("Groceries");
            expect(list.name).toBe("Groceries");
            expect(list.icon).toBe("📋");
            expect(list.isActive).toBe(true);
        });

        test("should create a list with custom icon", () => {
            const list = listsService.create("Shopping", "🛒");
            expect(list.icon).toBe("🛒");
        });

        test("should set sort_order incrementally", () => {
            const list1 = listsService.create("List 1");
            const list2 = listsService.create("List 2");
            expect(list2.sortOrder).toBeGreaterThan(list1.sortOrder);
        });
    });

    describe("getAll", () => {
        test("should return empty array when no lists exist", () => {
            const lists = listsService.getAll();
            expect(lists).toHaveLength(0);
        });

        test("should return all lists with counts", () => {
            listsService.create("List 1");
            listsService.create("List 2");
            const lists = listsService.getAll();
            expect(lists).toHaveLength(2);
        });
    });

    describe("getById", () => {
        test("should return null for non-existent list", () => {
            const list = listsService.getById(999);
            expect(list).toBeNull();
        });

        test("should return list by id", () => {
            const created = listsService.create("Test List");
            const found = listsService.getById(created.id);
            expect(found?.name).toBe("Test List");
        });
    });

    describe("update", () => {
        test("should update list name", () => {
            const list = listsService.create("Original");
            const updated = listsService.update(list.id, { name: "Updated" });
            expect(updated?.name).toBe("Updated");
        });

        test("should return null for non-existent list", () => {
            const result = listsService.update(999, { name: "Test" });
            expect(result).toBeNull();
        });
    });

    describe("setActive", () => {
        test("should set list as active", () => {
            const list1 = listsService.create("List 1");
            listsService.create("List 2");
            listsService.setActive(list1.id);
            const found = listsService.getById(list1.id);
            expect(found?.isActive).toBe(true);
        });

        test("should deactivate other lists", () => {
            const list1 = listsService.create("List 1");
            const list2 = listsService.create("List 2");
            listsService.setActive(list2.id);
            const found1 = listsService.getById(list1.id);
            expect(found1?.isActive).toBe(false);
        });
    });

    describe("delete", () => {
        test("should delete list", () => {
            const list = listsService.create("To Delete");
            listsService.create("Keep This");
            const result = listsService.delete(list.id);
            expect(result).toBe(true);
            expect(listsService.getById(list.id)).toBeNull();
        });

        test("should allow deleting last list", () => {
            const list = listsService.create("Only List");
            const deleted = listsService.delete(list.id);
            expect(deleted).toBe(true);
            expect(listsService.getAll()).toHaveLength(0);
        });
    });

    describe("reorder", () => {
        test("should reorder lists", () => {
            const list1 = listsService.create("List 1");
            const list2 = listsService.create("List 2");
            const list3 = listsService.create("List 3");

            listsService.reorder([list3.id, list1.id, list2.id]);

            const lists = listsService.getAll();
            expect(lists[0].id).toBe(list3.id);
            expect(lists[1].id).toBe(list1.id);
            expect(lists[2].id).toBe(list2.id);
        });
    });
});
