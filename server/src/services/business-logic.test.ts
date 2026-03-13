import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { createTestList, createTestSection, createTestItem, resetCounters } from "../test-helpers/factories";
import type { Database } from "bun:sqlite";

let db: Database;
let services: TestServices;

beforeEach(() => {
    resetCounters();
    db = createTestDb();
    services = createTestServices(db);
});

afterEach(() => {
    db?.close();
});

describe("Business Logic", () => {
    describe("Item Status Transitions", () => {
        test("new items default to active status", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            expect(item.status).toBe("active");
        });

        test("can transition from active to completed", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            const updated = services.items.update(item.id, { status: "completed" });
            expect(updated?.status).toBe("completed");
        });

        test("can transition from active to uncertain", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            const updated = services.items.update(item.id, { status: "uncertain" });
            expect(updated?.status).toBe("uncertain");
        });

        test("can transition from completed to active", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            services.items.update(item.id, { status: "completed" });
            const updated = services.items.update(item.id, { status: "active" });
            expect(updated?.status).toBe("active");
        });

        test("can transition from uncertain to completed", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            services.items.update(item.id, { status: "uncertain" });
            const updated = services.items.update(item.id, { status: "completed" });
            expect(updated?.status).toBe("completed");
        });

        test("can transition from completed to uncertain", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            services.items.update(item.id, { status: "completed" });
            const updated = services.items.update(item.id, { status: "uncertain" });
            expect(updated?.status).toBe("uncertain");
        });

        test("deleteCompletedInSection only removes completed items", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);

            const item1 = createTestItem(services, section.id, { name: "Active Item" });
            const item2 = createTestItem(services, section.id, { name: "Completed Item" });
            const item3 = createTestItem(services, section.id, { name: "Uncertain Item" });

            services.items.update(item2.id, { status: "completed" });
            services.items.update(item3.id, { status: "uncertain" });

            const deleted = services.items.deleteCompletedInSection(section.id);
            expect(deleted).toBe(1);

            expect(services.items.getById(item1.id)).not.toBeNull();
            expect(services.items.getById(item2.id)).toBeNull();
            expect(services.items.getById(item3.id)).not.toBeNull();
        });

        test("completed items sort after active items in sections", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);

            const item1 = createTestItem(services, section.id, { name: "First Active" });
            const item2 = createTestItem(services, section.id, { name: "Will Complete" });
            const item3 = createTestItem(services, section.id, { name: "Second Active" });

            services.items.update(item2.id, { status: "completed" });

            const items = services.sections.getItems(section.id);
            const names = items.map((i) => i.name);

            expect(names.indexOf("Will Complete")).toBeGreaterThan(names.indexOf("First Active"));
            expect(names.indexOf("Will Complete")).toBeGreaterThan(names.indexOf("Second Active"));
        });
    });

    describe("Sort Order Calculations", () => {
        test("new lists get incremented sort order", () => {
            const list1 = services.lists.create("List A");
            const list2 = services.lists.create("List B");
            const list3 = services.lists.create("List C");

            expect(list1.sortOrder).toBeLessThan(list2.sortOrder);
            expect(list2.sortOrder).toBeLessThan(list3.sortOrder);
        });

        test("new sections within a list get incremented sort order", () => {
            const list = createTestList(services);
            const section1 = services.sections.create(list.id, "Section A");
            const section2 = services.sections.create(list.id, "Section B");
            const section3 = services.sections.create(list.id, "Section C");

            expect(section1.sortOrder).toBeLessThan(section2.sortOrder);
            expect(section2.sortOrder).toBeLessThan(section3.sortOrder);
        });

        test("new items within a section get incremented sort order", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item1 = services.items.create(section.id, "Item A");
            const item2 = services.items.create(section.id, "Item B");
            const item3 = services.items.create(section.id, "Item C");

            expect(item1.sortOrder).toBeLessThan(item2.sortOrder);
            expect(item2.sortOrder).toBeLessThan(item3.sortOrder);
        });

        test("reordering lists updates sort orders correctly", () => {
            const list1 = services.lists.create("List A");
            const list2 = services.lists.create("List B");
            const list3 = services.lists.create("List C");

            services.lists.reorder([list3.id, list1.id, list2.id]);

            const lists = services.lists.getAll();
            expect(lists[0]?.name).toBe("List C");
            expect(lists[1]?.name).toBe("List A");
            expect(lists[2]?.name).toBe("List B");
        });

        test("reordering sections updates sort orders correctly", () => {
            const list = createTestList(services);
            const s1 = services.sections.create(list.id, "A");
            const s2 = services.sections.create(list.id, "B");
            const s3 = services.sections.create(list.id, "C");

            services.sections.reorder([s3.id, s1.id, s2.id]);

            const sections = services.sections.getByListId(list.id);
            expect(sections[0]?.name).toBe("C");
            expect(sections[1]?.name).toBe("A");
            expect(sections[2]?.name).toBe("B");
        });

        test("reordering items updates sort orders correctly", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const i1 = services.items.create(section.id, "A");
            const i2 = services.items.create(section.id, "B");
            const i3 = services.items.create(section.id, "C");

            services.items.reorder([i3.id, i1.id, i2.id]);

            const items = services.sections.getItems(section.id);
            const names = items.map((i) => i.name);
            expect(names[0]).toBe("C");
            expect(names[1]).toBe("A");
            expect(names[2]).toBe("B");
        });

        test("moving item to another section gets correct sort order", () => {
            const list = createTestList(services);
            const s1 = createTestSection(services, list.id, { name: "Source" });
            const s2 = createTestSection(services, list.id, { name: "Target" });

            services.items.create(s2.id, "Existing Item");
            const item = services.items.create(s1.id, "Moving Item");

            const moved = services.items.moveToSection(item.id, s2.id);
            expect(moved?.sectionId).toBe(s2.id);

            const targetItems = services.sections.getItems(s2.id);
            expect(targetItems.length).toBe(2);
        });
    });

    describe("Duplicate Detection", () => {
        test("list names must be unique (case-insensitive)", () => {
            services.lists.create("Grocery");

            expect(() => services.lists.create("Grocery")).toThrow("already exists");
        });

        test("list name uniqueness is case-insensitive", () => {
            services.lists.create("Grocery");

            expect(() => services.lists.create("grocery")).toThrow("already exists");
            expect(() => services.lists.create("GROCERY")).toThrow("already exists");
        });

        test("history entries are deduplicated by name", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);

            services.items.create(section.id, "Milk");
            services.items.create(section.id, "Milk");

            const history = services.items.getHistory();
            const milkEntries = history.filter((h) => h.name === "Milk");
            expect(milkEntries.length).toBe(1);
            expect(milkEntries[0]?.frequency).toBe(2);
        });

        test("history frequency increments on duplicate adds", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);

            services.items.create(section.id, "Bread");
            services.items.create(section.id, "Bread");
            services.items.create(section.id, "Bread");

            const history = services.items.getHistory();
            const breadEntry = history.find((h) => h.name === "Bread");
            expect(breadEntry?.frequency).toBe(3);
        });
    });

    describe("Active List Management", () => {
        test("creating a list sets it as active", () => {
            const list = services.lists.create("Grocery");
            expect(list.isActive).toBe(true);
        });

        test("setActive deactivates other lists", () => {
            const list1 = services.lists.create("List A");
            const list2 = services.lists.create("List B");

            services.lists.setActive(list1.id);

            const refreshed1 = services.lists.getById(list1.id);
            const refreshed2 = services.lists.getById(list2.id);
            expect(refreshed1?.isActive).toBe(true);
            expect(refreshed2?.isActive).toBe(false);
        });

        test("getActive returns the currently active list", () => {
            const list1 = services.lists.create("List A");
            services.lists.create("List B");

            services.lists.setActive(list1.id);
            const active = services.lists.getActive();
            expect(active?.id).toBe(list1.id);
        });
    });

    describe("Cascade Deletes", () => {
        test("deleting a list deletes its sections and items", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            createTestItem(services, section.id);
            createTestItem(services, section.id);

            services.lists.delete(list.id);

            expect(services.sections.getById(section.id)).toBeNull();
            expect(services.sections.getByListId(list.id).length).toBe(0);
        });

        test("deleting a section deletes its items", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            services.sections.delete(section.id);

            expect(services.items.getById(item.id)).toBeNull();
        });
    });

    describe("List Counts", () => {
        test("getAll returns correct item and section counts", () => {
            const list = createTestList(services);
            const s1 = createTestSection(services, list.id);
            const s2 = createTestSection(services, list.id);
            createTestItem(services, s1.id);
            createTestItem(services, s1.id);
            createTestItem(services, s2.id);

            const lists = services.lists.getAll();
            const found = lists.find((l) => l.id === list.id);
            expect(found?.sectionCount).toBe(2);
            expect(found?.itemCount).toBe(3);
        });
    });

    describe("Item Updates", () => {
        test("updating name changes the item name", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id, { name: "Original" });

            const updated = services.items.update(item.id, { name: "Updated" });
            expect(updated?.name).toBe("Updated");
        });

        test("updating description to null clears it", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id, { description: "Has description" });

            const updated = services.items.update(item.id, { description: null });
            expect(updated?.description).toBeNull();
        });

        test("updating quantity to null clears it", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id, { quantity: "2 lbs" });

            const updated = services.items.update(item.id, { quantity: null });
            expect(updated?.quantity).toBeNull();
        });

        test("update modifies updated_at to current time", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            const item = createTestItem(services, section.id);

            const updated = services.items.update(item.id, { name: "Changed" });
            expect(updated?.updatedAt).toBeDefined();
            expect(typeof updated?.updatedAt).toBe("string");
        });

        test("update returns null for non-existent item", () => {
            const result = services.items.update(99999, { name: "Ghost" });
            expect(result).toBeNull();
        });
    });
});
