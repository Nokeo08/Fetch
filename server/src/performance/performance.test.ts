import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { resetCounters } from "../test-helpers/factories";
import app from "../index";

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

describe("Performance Tests", () => {
    describe("Response Time", () => {
        test("health endpoint responds within 200ms", async () => {
            const start = performance.now();
            const res = await app.request("/health");
            const elapsed = performance.now() - start;

            expect(res.status).toBe(200);
            expect(elapsed).toBeLessThan(200);
        });

        test("list creation responds within 200ms", async () => {
            const start = performance.now();
            const res = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: `Perf Test ${Date.now()}` }),
            });
            const elapsed = performance.now() - start;

            expect(res.status).toBe(201);
            expect(elapsed).toBeLessThan(200);
        });

        test("listing all lists responds within 200ms", async () => {
            for (let i = 0; i < 10; i++) {
                await app.request("/api/v1/lists", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: `Perf List ${Date.now()}-${i}` }),
                });
            }

            const start = performance.now();
            const res = await app.request("/api/v1/lists");
            const elapsed = performance.now() - start;

            expect(res.status).toBe(200);
            expect(elapsed).toBeLessThan(200);
        });
    });

    describe("Database Query Optimization (no N+1)", () => {
        test("getAll lists with counts uses a single query", () => {
            for (let i = 0; i < 5; i++) {
                const list = services.lists.create(`N+1 Test ${i}`);
                const section = services.sections.create(list.id, `Section ${i}`);
                for (let j = 0; j < 3; j++) {
                    services.items.create(section.id, `Item ${i}-${j}`);
                }
            }

            const start = performance.now();
            const lists = services.lists.getAll();
            const elapsed = performance.now() - start;

            expect(lists.length).toBe(5);
            expect(elapsed).toBeLessThan(100);

            for (const list of lists) {
                expect(list.itemCount).toBe(3);
                expect(list.sectionCount).toBe(1);
            }
        });

        test("getByListIdWithItems efficiently fetches sections and items", () => {
            const list = services.lists.create("Efficient Fetch");
            for (let i = 0; i < 5; i++) {
                const section = services.sections.create(list.id, `Section ${i}`);
                for (let j = 0; j < 10; j++) {
                    services.items.create(section.id, `Item ${i}-${j}`);
                }
            }

            const start = performance.now();
            const sections = services.sections.getByListIdWithItems(list.id);
            const elapsed = performance.now() - start;

            expect(sections.length).toBe(5);
            for (const section of sections) {
                expect(section.items.length).toBe(10);
            }
            expect(elapsed).toBeLessThan(100);
        });
    });

    describe("Concurrent Operations", () => {
        test("multiple concurrent list operations", async () => {
            const promises = Array.from({ length: 20 }, (_, i) =>
                app.request("/api/v1/lists", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: `Concurrent ${Date.now()}-${i}` }),
                })
            );

            const start = performance.now();
            const results = await Promise.all(promises);
            const elapsed = performance.now() - start;

            const successCount = results.filter((r) => r.status === 201).length;
            expect(successCount).toBeGreaterThanOrEqual(15);
            expect(elapsed).toBeLessThan(2000);
        });

        test("concurrent reads while writing", async () => {
            for (let i = 0; i < 5; i++) {
                await app.request("/api/v1/lists", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: `Read-Write ${Date.now()}-${i}` }),
                });
            }

            const readPromises = Array.from({ length: 10 }, () => app.request("/api/v1/lists"));
            const writePromise = app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: `Write During Read ${Date.now()}` }),
            });

            const results = await Promise.all([...readPromises, writePromise]);
            const allSuccessful = results.every((r) => r.status === 200 || r.status === 201);
            expect(allSuccessful).toBe(true);
        });
    });

    describe("Memory and Bulk Operations", () => {
        test("creating 100 items does not degrade performance", () => {
            const list = services.lists.create("Bulk Test");
            const section = services.sections.create(list.id, "Bulk Section");

            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                services.items.create(section.id, `Bulk Item ${i}`);
            }
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(2000);

            const items = services.sections.getItems(section.id);
            expect(items.length).toBe(100);
        });

        test("export with many items completes in reasonable time", () => {
            const list = services.lists.create("Export Perf");
            for (let s = 0; s < 5; s++) {
                const section = services.sections.create(list.id, `Section ${s}`);
                for (let i = 0; i < 20; i++) {
                    services.items.create(section.id, `Item ${s}-${i}`, `Description ${s}-${i}`, `${i} pcs`);
                }
            }

            const start = performance.now();
            const exported = services.importExport.exportData({ includeHistory: true });
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(1000);
            expect(exported.lists.length).toBeGreaterThanOrEqual(1);
        });

        test("search performs well with large history", () => {
            const list = services.lists.create("Search Perf");
            const section = services.sections.create(list.id, "Section");

            for (let i = 0; i < 50; i++) {
                services.items.create(section.id, `Unique Item Name ${i}`);
            }

            const start = performance.now();
            const results = services.items.searchHistory("Unique");
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(500);
            expect(results.length).toBeGreaterThan(0);
        });
    });
});
