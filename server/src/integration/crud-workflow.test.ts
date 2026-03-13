import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { createTestDb, createTestServices, type TestServices } from "../test-helpers/db";
import { resetCounters } from "../test-helpers/factories";
import app from "../index";
import type { ApiResponse, ShoppingList, Section, Item } from "shared/dist";

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

describe("CRUD Workflow Integration", () => {
    describe("Create list -> Create section -> Create item", () => {
        test("full creation workflow via API", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Grocery", icon: "🛒" }),
            });
            expect(listRes.status).toBe(201);
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            expect(listData.data.name).toBe("Grocery");
            const listId = listData.data.id;

            const sectionRes = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Dairy" }),
            });
            expect(sectionRes.status).toBe(201);
            const sectionData = (await sectionRes.json()) as ApiJson<Section>;
            expect(sectionData.data.name).toBe("Dairy");
            const sectionId = sectionData.data.id;

            const itemRes = await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Milk", description: "Whole milk", quantity: "1 gallon" }),
            });
            expect(itemRes.status).toBe(201);
            const itemData = (await itemRes.json()) as ApiJson<Item>;
            expect(itemData.data.name).toBe("Milk");
            expect(itemData.data.description).toBe("Whole milk");
            expect(itemData.data.quantity).toBe("1 gallon");
            expect(itemData.data.status).toBe("active");
        });
    });

    describe("Edit item -> Update displayed", () => {
        test("updating item fields via API", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Edit Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const listId = listData.data.id;

            const sectionRes = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const sectionData = (await sectionRes.json()) as ApiJson<Section>;

            const createRes = await app.request(`/api/v1/sections/${sectionData.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Original Name" }),
            });
            const createData = (await createRes.json()) as ApiJson<Item>;
            const itemId = createData.data.id;

            const updateRes = await app.request(`/api/v1/items/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Updated Name",
                    description: "New description",
                    quantity: "2 lbs",
                    status: "completed",
                }),
            });
            expect(updateRes.status).toBe(200);
            const updateData = (await updateRes.json()) as ApiJson<Item>;
            expect(updateData.data.name).toBe("Updated Name");
            expect(updateData.data.description).toBe("New description");
            expect(updateData.data.quantity).toBe("2 lbs");
            expect(updateData.data.status).toBe("completed");

            const getRes = await app.request(`/api/v1/items/${itemId}`);
            const getData = (await getRes.json()) as ApiJson<Item>;
            expect(getData.data.name).toBe("Updated Name");
        });
    });

    describe("Delete section with items", () => {
        test("deleting a section removes it and its items", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Delete Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;

            const sectionRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "To Delete" }),
            });
            const sectionData = (await sectionRes.json()) as ApiJson<Section>;
            const sectionId = sectionData.data.id;

            await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item 1" }),
            });
            await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Item 2" }),
            });

            const deleteRes = await app.request(`/api/v1/sections/${sectionId}`, {
                method: "DELETE",
            });
            expect(deleteRes.status).toBe(200);

            const getRes = await app.request(`/api/v1/sections/${sectionId}`);
            expect(getRes.status).toBe(404);

            const itemsRes = await app.request(`/api/v1/sections/${sectionId}/items`);
            const itemsData = (await itemsRes.json()) as ApiJson<Item[]>;
            expect(itemsData.data).toEqual([]);
        });
    });

    describe("Reorder lists/sections/items", () => {
        test("reordering lists via API", async () => {
            const r1 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Alpha" }),
            });
            const r2 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Beta" }),
            });
            const r3 = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Gamma" }),
            });

            const d1 = (await r1.json()) as ApiJson<ShoppingList>;
            const d2 = (await r2.json()) as ApiJson<ShoppingList>;
            const d3 = (await r3.json()) as ApiJson<ShoppingList>;

            const reorderRes = await app.request("/api/v1/lists/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [d3.data.id, d1.data.id, d2.data.id] }),
            });
            expect(reorderRes.status).toBe(200);

            const listsRes = await app.request("/api/v1/lists");
            const listsData = (await listsRes.json()) as ApiJson<ShoppingList[]>;
            const names = listsData.data.map((l: ShoppingList) => l.name);
            const gammaIdx = names.indexOf("Gamma");
            const alphaIdx = names.indexOf("Alpha");
            const betaIdx = names.indexOf("Beta");
            expect(gammaIdx).toBeLessThan(alphaIdx);
            expect(alphaIdx).toBeLessThan(betaIdx);
        });

        test("reordering items via API", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Reorder Items Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;

            const sectionRes = await app.request(`/api/v1/lists/${listData.data.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Section" }),
            });
            const sectionData = (await sectionRes.json()) as ApiJson<Section>;
            const sectionId = sectionData.data.id;

            const i1 = await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "First" }),
            });
            const i2 = await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Second" }),
            });
            const i3 = await app.request(`/api/v1/sections/${sectionId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Third" }),
            });

            const id1 = ((await i1.json()) as ApiJson<Item>).data.id;
            const id2 = ((await i2.json()) as ApiJson<Item>).data.id;
            const id3 = ((await i3.json()) as ApiJson<Item>).data.id;

            const reorderRes = await app.request("/api/v1/items/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [id3, id1, id2] }),
            });
            expect(reorderRes.status).toBe(200);
        });
    });

    describe("Move items between sections", () => {
        test("moving an item to another section via API", async () => {
            const listRes = await app.request("/api/v1/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Move Test" }),
            });
            const listData = (await listRes.json()) as ApiJson<ShoppingList>;
            const listId = listData.data.id;

            const s1Res = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Source" }),
            });
            const s2Res = await app.request(`/api/v1/lists/${listId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Target" }),
            });
            const s1Data = (await s1Res.json()) as ApiJson<Section>;
            const s2Data = (await s2Res.json()) as ApiJson<Section>;

            const itemRes = await app.request(`/api/v1/sections/${s1Data.data.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Moving Item" }),
            });
            const itemData = (await itemRes.json()) as ApiJson<Item>;

            const moveRes = await app.request(`/api/v1/items/${itemData.data.id}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetSectionId: s2Data.data.id }),
            });
            expect(moveRes.status).toBe(200);
            const moveData = (await moveRes.json()) as ApiJson<Item>;
            expect(moveData.data.sectionId).toBe(s2Data.data.id);
        });
    });
});
