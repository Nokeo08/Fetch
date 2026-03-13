import type { TestServices } from "./db";
import type { ExportData } from "shared/dist";

let listCounter = 0;
let sectionCounter = 0;
let itemCounter = 0;
let templateCounter = 0;

export function resetCounters(): void {
    listCounter = 0;
    sectionCounter = 0;
    itemCounter = 0;
    templateCounter = 0;
}

export function createTestList(
    services: TestServices,
    overrides?: { name?: string; icon?: string }
) {
    listCounter++;
    const name = overrides?.name ?? `Test List ${listCounter}`;
    return services.lists.create(name, overrides?.icon);
}

export function createTestSection(
    services: TestServices,
    listId: number,
    overrides?: { name?: string }
) {
    sectionCounter++;
    const name = overrides?.name ?? `Test Section ${sectionCounter}`;
    return services.sections.create(listId, name);
}

export function createTestItem(
    services: TestServices,
    sectionId: number,
    overrides?: { name?: string; description?: string; quantity?: string }
) {
    itemCounter++;
    const name = overrides?.name ?? `Test Item ${itemCounter}`;
    return services.items.create(sectionId, name, overrides?.description, overrides?.quantity);
}

export function createTestTemplate(
    services: TestServices,
    overrides?: { name?: string }
) {
    templateCounter++;
    const name = overrides?.name ?? `Test Template ${templateCounter}`;
    return services.templates.create(name);
}

export function createTestExportData(overrides?: Partial<ExportData>): ExportData {
    return {
        version: "1.0.0",
        exported_at: new Date().toISOString(),
        lists: overrides?.lists ?? [
            {
                name: "Grocery",
                icon: "🛒",
                sections: [
                    {
                        name: "Dairy",
                        items: [
                            { name: "Milk", description: "Whole milk", quantity: "1 gallon", status: "active" },
                            { name: "Cheese", description: null, quantity: "1 block", status: "active" },
                        ],
                    },
                    {
                        name: "Produce",
                        items: [
                            { name: "Apples", description: "Honeycrisp", quantity: "6", status: "active" },
                        ],
                    },
                ],
            },
        ],
        templates: overrides?.templates ?? [
            {
                name: "Weekly Basics",
                items: [
                    { name: "Bread", description: null, quantity: "1 loaf", sectionName: "Bakery" },
                    { name: "Eggs", description: "Large", quantity: "1 dozen", sectionName: "Dairy" },
                ],
            },
        ],
        history: overrides?.history ?? [
            { name: "Milk", sectionName: "Dairy", description: "Whole milk", quantity: "1 gallon", frequency: 5 },
            { name: "Bread", sectionName: "Bakery", description: null, quantity: "1 loaf", frequency: 3 },
        ],
    };
}
