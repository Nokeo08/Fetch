import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { createTestExportData, createTestList, createTestSection, createTestItem, resetCounters } from "../test-helpers/factories";
import { validateImportData } from "../services/import-export";
import app from "../index";

type ApiJson<T = unknown> = { success: boolean; data: T; error?: string };

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

describe("Import/Export Integration", () => {
    describe("Export data -> Import same data", () => {
        test("round-trip export and import preserves data", () => {
            const list = createTestList(services, { name: "Grocery" });
            const section = createTestSection(services, list.id, { name: "Dairy" });
            createTestItem(services, section.id, { name: "Milk", description: "Whole", quantity: "1 gal" });
            createTestItem(services, section.id, { name: "Cheese", quantity: "1 block" });

            const exported = services.importExport.exportData({ includeHistory: true });
            expect(exported.version).toBe("1.0.0");
            expect(exported.lists.length).toBeGreaterThanOrEqual(1);

            const groceryList = exported.lists.find((l) => l.name === "Grocery");
            expect(groceryList).toBeDefined();
            expect(groceryList?.sections?.length).toBe(1);
            expect(groceryList?.sections?.[0]?.items?.length).toBe(2);

            services.lists.delete(list.id);

            const result = services.importExport.importData(exported, {
                mode: "replace",
                importLists: true,
                importTemplates: true,
                importHistory: true,
            });

            expect(result.listsImported).toBeGreaterThanOrEqual(1);

            const allLists = services.lists.getAll();
            const reimported = allLists.find((l) => l.name === "Grocery");
            expect(reimported).toBeDefined();
        });

        test("round-trip via API endpoints", async () => {
            await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Export Test" }),
            });

            const exportRes = await app.request("/api/v1/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeHistory: true }),
            });
            expect(exportRes.status).toBe(200);
            const exportData = (await exportRes.json()) as ApiJson;

            const previewRes = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(exportData.data),
            });
            expect(previewRes.status).toBe(200);
        });
    });

    describe("Import validation errors", () => {
        test("rejects data without version", () => {
            const result = validateImportData({ lists: [] });
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
            expect(result.errors.some((e) => e.message.includes("Unsupported version"))).toBe(true);
        });

        test("rejects data without lists array", () => {
            const result = validateImportData({
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: "not-an-array",
            });
            expect(result.valid).toBe(false);
        });

        test("rejects list without name", () => {
            const result = validateImportData({
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [{ sections: [] }],
            });
            expect(result.valid).toBe(false);
        });

        test("rejects item with invalid status", () => {
            const result = validateImportData({
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [{
                    name: "Test",
                    sections: [{
                        name: "Section",
                        items: [{ name: "Item", status: "invalid-status" }],
                    }],
                }],
            });
            expect(result.valid).toBe(false);
        });

        test("accepts valid import data", () => {
            const data = createTestExportData();
            const result = validateImportData(data);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test("validates template structure", () => {
            const result = validateImportData({
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [],
                templates: [{ items: [] }],
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path.includes("templates"))).toBe(true);
        });

        test("validates history structure", () => {
            const result = validateImportData({
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: [],
                history: [{ frequency: 1 }],
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path.includes("history"))).toBe(true);
        });

        test("API returns 400 for invalid import data", async () => {
            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invalid: true }),
            });
            expect(res.status).toBe(400);
        });

        test("API returns 400 for invalid JSON", async () => {
            const res = await app.request("/api/v1/import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "not-json{{{",
            });
            expect(res.status).toBe(400);
        });
    });

    describe("Merge mode", () => {
        test("merge adds new items to existing sections", () => {
            const list = createTestList(services, { name: "Grocery" });
            const section = createTestSection(services, list.id, { name: "Dairy" });
            createTestItem(services, section.id, { name: "Milk" });

            const importData = createTestExportData({
                lists: [{
                    name: "Grocery",
                    icon: "🛒",
                    sections: [{
                        name: "Dairy",
                        items: [
                            { name: "Milk", status: "active", description: null, quantity: null },
                            { name: "Yogurt", status: "active", description: null, quantity: null },
                        ],
                    }],
                }],
            });

            const result = services.importExport.importData(importData, {
                mode: "merge",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsMerged).toBe(1);
            expect(result.skipped.some((s) => s.includes("Milk"))).toBe(true);
        });
    });

    describe("Replace mode", () => {
        test("replace removes existing data first", () => {
            createTestList(services, { name: "Old List" });

            const importData = createTestExportData({
                lists: [{
                    name: "New List",
                    icon: "🆕",
                    sections: [],
                }],
            });

            const result = services.importExport.importData(importData, {
                mode: "replace",
                importLists: true,
                importTemplates: false,
                importHistory: false,
            });

            expect(result.listsImported).toBe(1);
            const allLists = services.lists.getAll();
            expect(allLists.find((l) => l.name === "Old List")).toBeUndefined();
            expect(allLists.find((l) => l.name === "New List")).toBeDefined();
        });
    });

    describe("Export summary", () => {
        test("returns correct counts", () => {
            const list = createTestList(services);
            const section = createTestSection(services, list.id);
            createTestItem(services, section.id);
            createTestItem(services, section.id);

            const summary = services.importExport.getExportSummary();
            expect(summary.lists.length).toBeGreaterThanOrEqual(1);
            const listSummary = summary.lists.find((l) => l.id === list.id);
            expect(listSummary?.itemCount).toBe(2);
        });

        test("export summary via API", async () => {
            const res = await app.request("/api/v1/export/summary");
            expect(res.status).toBe(200);
            const data = (await res.json()) as ApiJson;
            expect(data.success).toBe(true);
        });
    });
});
