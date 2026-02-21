import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createSectionsService } from "./sections";
import { createListsService } from "./lists";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("SectionsService", () => {
    let db: Database;
    let sectionsService: ReturnType<typeof createSectionsService>;
    let listsService: ReturnType<typeof createListsService>;
    let testListId: number;

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        sectionsService = createSectionsService(db);
        listsService = createListsService(db);
        const list = listsService.create("Test List");
        testListId = list.id;
    });

    afterEach(() => {
        db.close();
    });

    describe("create", () => {
        test("should create a section", () => {
            const section = sectionsService.create(testListId, "Dairy");
            expect(section.name).toBe("Dairy");
            expect(section.listId).toBe(testListId);
        });

        test("should set sort_order incrementally", () => {
            const section1 = sectionsService.create(testListId, "Section 1");
            const section2 = sectionsService.create(testListId, "Section 2");
            expect(section2.sortOrder).toBeGreaterThan(section1.sortOrder);
        });
    });

    describe("getByListId", () => {
        test("should return sections for a list", () => {
            sectionsService.create(testListId, "Section 1");
            sectionsService.create(testListId, "Section 2");
            const sections = sectionsService.getByListId(testListId);
            expect(sections).toHaveLength(2);
        });

        test("should return empty array for list with no sections", () => {
            const sections = sectionsService.getByListId(testListId);
            expect(sections).toHaveLength(0);
        });
    });

    describe("update", () => {
        test("should update section name", () => {
            const section = sectionsService.create(testListId, "Original");
            const updated = sectionsService.update(section.id, "Updated");
            expect(updated?.name).toBe("Updated");
        });
    });

    describe("delete", () => {
        test("should delete section", () => {
            const section = sectionsService.create(testListId, "To Delete");
            const result = sectionsService.delete(section.id);
            expect(result).toBe(true);
            expect(sectionsService.getById(section.id)).toBeNull();
        });
    });

    describe("reorder", () => {
        test("should reorder sections", () => {
            const section1 = sectionsService.create(testListId, "Section 1");
            const section2 = sectionsService.create(testListId, "Section 2");
            const section3 = sectionsService.create(testListId, "Section 3");

            sectionsService.reorder([section3.id, section1.id, section2.id]);

            const sections = sectionsService.getByListId(testListId);
            expect(sections[0].id).toBe(section3.id);
            expect(sections[1].id).toBe(section1.id);
            expect(sections[2].id).toBe(section2.id);
        });
    });
});
