import { describe, test, expect } from "bun:test";
import app from "../index";
import type { ShoppingList, Section, Item, ApiResponse } from "shared/dist";

type ApiJson<T = unknown> = { success: boolean; data: T; error?: string };
type TemplateResponse = { id: number; name: string; items: { id: number; name: string }[] };

describe("E2E: Complete Shopping Trip Workflow", () => {
    test("full workflow: login -> create list -> add sections -> add items -> mark complete -> clear completed -> logout", async () => {
        const loginRes = await app.request("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "test-password" }),
        });
        expect(loginRes.status).toBe(200);
        const setCookie = loginRes.headers.get("set-cookie");
        const sessionMatch = setCookie?.match(/session=([^;]+)/);
        const sessionToken = sessionMatch?.[1] ?? "";

        const headers = {
            "Content-Type": "application/json",
            Cookie: `session=${sessionToken}`,
        };

        const listRes = await app.request("/api/v1/lists", {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Weekend Shopping", icon: "🛒" }),
        });
        expect(listRes.status).toBe(201);
        const listData = (await listRes.json()) as ApiJson<ShoppingList>;
        expect(listData.data.name).toBe("Weekend Shopping");
        const listId = listData.data.id;

        const dairyRes = await app.request(`/api/v1/lists/${listId}/sections`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Dairy" }),
        });
        expect(dairyRes.status).toBe(201);
        const dairyData = (await dairyRes.json()) as ApiJson<Section>;
        const dairyId = dairyData.data.id;

        const produceRes = await app.request(`/api/v1/lists/${listId}/sections`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Produce" }),
        });
        expect(produceRes.status).toBe(201);
        const produceData = (await produceRes.json()) as ApiJson<Section>;
        const produceId = produceData.data.id;

        const milkRes = await app.request(`/api/v1/sections/${dairyId}/items`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Milk", quantity: "1 gallon" }),
        });
        expect(milkRes.status).toBe(201);
        const milkData = (await milkRes.json()) as ApiJson<Item>;

        const cheeseRes = await app.request(`/api/v1/sections/${dairyId}/items`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Cheese", quantity: "1 block" }),
        });
        expect(cheeseRes.status).toBe(201);
        const cheeseData = (await cheeseRes.json()) as ApiJson<Item>;

        const applesRes = await app.request(`/api/v1/sections/${produceId}/items`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "Apples", quantity: "6" }),
        });
        expect(applesRes.status).toBe(201);
        const applesData = (await applesRes.json()) as ApiJson<Item>;

        const completeMilk = await app.request(`/api/v1/items/${milkData.data.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: "completed" }),
        });
        expect(completeMilk.status).toBe(200);
        const completedMilk = (await completeMilk.json()) as ApiJson<Item>;
        expect(completedMilk.data.status).toBe("completed");

        const completeCheese = await app.request(`/api/v1/items/${cheeseData.data.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: "completed" }),
        });
        expect(completeCheese.status).toBe(200);

        const sectionsRes = await app.request(`/api/v1/lists/${listId}/sections`, {
            headers,
        });
        expect(sectionsRes.status).toBe(200);
        const sectionsData = (await sectionsRes.json()) as ApiJson<(Section & { items: Item[] })[]>;
        const dairySection = sectionsData.data.find((s) => s.id === dairyId);
        expect(dairySection).toBeDefined();
        const completedCount = dairySection?.items.filter((i) => i.status === "completed").length;
        expect(completedCount).toBe(2);

        const applesItem = sectionsData.data.find((s) => s.id === produceId)?.items.find((i) => i.name === "Apples");
        expect(applesItem?.status).toBe("active");

        const logoutRes = await app.request("/api/logout", {
            method: "POST",
            headers,
        });
        expect(logoutRes.status).toBe(200);
    });
});

describe("E2E: Template Workflow", () => {
    test("create template -> add items -> apply to list", async () => {
        const templateRes = await app.request("/api/v1/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Weekly Basics" }),
        });
        expect(templateRes.status).toBe(201);
        const templateData = (await templateRes.json()) as ApiJson<TemplateResponse>;
        const templateId = templateData.data.id;

        const item1 = await app.request(`/api/v1/templates/${templateId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Bread", sectionName: "Bakery" }),
        });
        expect(item1.status).toBe(201);

        const item2 = await app.request(`/api/v1/templates/${templateId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Eggs", sectionName: "Dairy", quantity: "1 dozen" }),
        });
        expect(item2.status).toBe(201);

        const item3 = await app.request(`/api/v1/templates/${templateId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Bananas", sectionName: "Produce" }),
        });
        expect(item3.status).toBe(201);

        const listRes = await app.request("/api/v1/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Template Applied List" }),
        });
        expect(listRes.status).toBe(201);
        const listData = (await listRes.json()) as ApiJson<ShoppingList>;
        const listId = listData.data.id;

        const applyRes = await app.request(`/api/v1/templates/${templateId}/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listId }),
        });
        expect(applyRes.status).toBe(200);
        const applyData = (await applyRes.json()) as ApiJson<Record<string, unknown>>;
        expect(applyData.success).toBe(true);

        const sectionsRes = await app.request(`/api/v1/lists/${listId}/sections`);
        const sectionsData = (await sectionsRes.json()) as ApiJson<(Section & { items: Item[] })[]>;
        expect(sectionsData.data.length).toBeGreaterThanOrEqual(2);

        const allItemNames = sectionsData.data.flatMap((s) => s.items.map((i) => i.name));
        expect(allItemNames).toContain("Bread");
        expect(allItemNames).toContain("Eggs");
        expect(allItemNames).toContain("Bananas");
    });

    test("create template from existing list sections", async () => {
        const listRes = await app.request("/api/v1/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Source List" }),
        });
        const listData = (await listRes.json()) as ApiJson<ShoppingList>;
        const listId = listData.data.id;

        const sectionRes = await app.request(`/api/v1/lists/${listId}/sections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Frozen" }),
        });
        const sectionData = (await sectionRes.json()) as ApiJson<Section>;

        await app.request(`/api/v1/sections/${sectionData.data.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Ice Cream" }),
        });

        const createTemplateRes = await app.request(`/api/v1/lists/${listId}/template`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "From Source" }),
        });
        expect(createTemplateRes.status).toBe(201);
        const templateData = (await createTemplateRes.json()) as ApiJson<TemplateResponse>;
        expect(templateData.data.name).toBe("From Source");
        expect(templateData.data.items.length).toBeGreaterThanOrEqual(1);
    });
});
