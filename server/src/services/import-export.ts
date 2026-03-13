import type { Database } from "bun:sqlite";
import type {
    ExportData,
    ExportListData,
    ExportSectionData,
    ExportItemData,
    ExportTemplateData,
    ExportTemplateItemData,
    ExportHistoryData,
    ExportOptions,
    ExportSummary,
    ImportPreview,
    ImportOptions,
    ImportResult,
    ItemStatus,
} from "shared/dist";

const SUPPORTED_VERSIONS = ["1.0.0"];
const VALID_STATUSES: ItemStatus[] = ["active", "completed", "uncertain"];
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

type DbList = {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    is_active: number;
    created_at: string;
};

type DbSection = {
    id: number;
    list_id: number;
    name: string;
    sort_order: number;
    created_at: string;
};

type DbItem = {
    id: number;
    section_id: number;
    name: string;
    description: string | null;
    quantity: string | null;
    status: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

type DbTemplate = {
    id: number;
    name: string;
    created_at: string;
};

type DbTemplateItem = {
    id: number;
    template_id: number;
    name: string;
    description: string | null;
    quantity: string | null;
    section_name: string | null;
    sort_order: number;
};

type DbHistoryEntry = {
    id: number;
    name: string;
    section_name: string | null;
    description: string | null;
    quantity: string | null;
    frequency: number;
    last_used: string;
};

function sanitizeString(value: unknown, maxLength: number = 500): string {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

function sanitizeNullableString(value: unknown, maxLength: number = 500): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function isValidStatus(status: unknown): status is ItemStatus {
    return typeof status === "string" && VALID_STATUSES.includes(status as ItemStatus);
}

export type ValidationError = {
    path: string;
    message: string;
};

/** Validates import data structure and returns any validation errors for lists, templates, and history entries. */
export function validateImportData(data: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== "object") {
        errors.push({ path: "root", message: "Import data must be a JSON object" });
        return { valid: false, errors };
    }

    const obj = data as Record<string, unknown>;

    if (!obj.version || typeof obj.version !== "string") {
        errors.push({ path: "version", message: "Missing or invalid version field" });
    } else if (!SUPPORTED_VERSIONS.includes(obj.version)) {
        errors.push({ path: "version", message: `Unsupported version "${obj.version}". Supported: ${SUPPORTED_VERSIONS.join(", ")}` });
    }

    if (!obj.exported_at || typeof obj.exported_at !== "string") {
        errors.push({ path: "exported_at", message: "Missing or invalid exported_at field" });
    }

    if (!Array.isArray(obj.lists)) {
        errors.push({ path: "lists", message: "Missing or invalid lists field (must be an array)" });
    } else {
        for (let i = 0; i < obj.lists.length; i++) {
            const list = obj.lists[i] as Record<string, unknown>;
            if (!list || typeof list !== "object") {
                errors.push({ path: `lists[${i}]`, message: "List must be an object" });
                continue;
            }
            if (!list.name || typeof list.name !== "string") {
                errors.push({ path: `lists[${i}].name`, message: "List name is required and must be a string" });
            }
            if (list.sections !== undefined && !Array.isArray(list.sections)) {
                errors.push({ path: `lists[${i}].sections`, message: "Sections must be an array" });
            } else if (Array.isArray(list.sections)) {
                for (let j = 0; j < list.sections.length; j++) {
                    const section = list.sections[j] as Record<string, unknown>;
                    if (!section || typeof section !== "object") {
                        errors.push({ path: `lists[${i}].sections[${j}]`, message: "Section must be an object" });
                        continue;
                    }
                    if (!section.name || typeof section.name !== "string") {
                        errors.push({ path: `lists[${i}].sections[${j}].name`, message: "Section name is required" });
                    }
                    if (section.items !== undefined && !Array.isArray(section.items)) {
                        errors.push({ path: `lists[${i}].sections[${j}].items`, message: "Items must be an array" });
                    } else if (Array.isArray(section.items)) {
                        for (let k = 0; k < section.items.length; k++) {
                            const item = section.items[k] as Record<string, unknown>;
                            if (!item || typeof item !== "object") {
                                errors.push({ path: `lists[${i}].sections[${j}].items[${k}]`, message: "Item must be an object" });
                                continue;
                            }
                            if (!item.name || typeof item.name !== "string") {
                                errors.push({ path: `lists[${i}].sections[${j}].items[${k}].name`, message: "Item name is required" });
                            }
                            if (item.status !== undefined && !isValidStatus(item.status)) {
                                errors.push({ path: `lists[${i}].sections[${j}].items[${k}].status`, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
                            }
                        }
                    }
                }
            }
        }
    }

    if (obj.templates !== undefined) {
        if (!Array.isArray(obj.templates)) {
            errors.push({ path: "templates", message: "Templates must be an array" });
        } else {
            for (let i = 0; i < obj.templates.length; i++) {
                const template = obj.templates[i] as Record<string, unknown>;
                if (!template || typeof template !== "object") {
                    errors.push({ path: `templates[${i}]`, message: "Template must be an object" });
                    continue;
                }
                if (!template.name || typeof template.name !== "string") {
                    errors.push({ path: `templates[${i}].name`, message: "Template name is required" });
                }
                if (template.items !== undefined && !Array.isArray(template.items)) {
                    errors.push({ path: `templates[${i}].items`, message: "Template items must be an array" });
                } else if (Array.isArray(template.items)) {
                    for (let j = 0; j < template.items.length; j++) {
                        const item = template.items[j] as Record<string, unknown>;
                        if (!item || typeof item !== "object") {
                            errors.push({ path: `templates[${i}].items[${j}]`, message: "Template item must be an object" });
                            continue;
                        }
                        if (!item.name || typeof item.name !== "string") {
                            errors.push({ path: `templates[${i}].items[${j}].name`, message: "Template item name is required" });
                        }
                    }
                }
            }
        }
    }

    if (obj.history !== undefined) {
        if (!Array.isArray(obj.history)) {
            errors.push({ path: "history", message: "History must be an array" });
        } else {
            for (let i = 0; i < obj.history.length; i++) {
                const entry = obj.history[i] as Record<string, unknown>;
                if (!entry || typeof entry !== "object") {
                    errors.push({ path: `history[${i}]`, message: "History entry must be an object" });
                    continue;
                }
                if (!entry.name || typeof entry.name !== "string") {
                    errors.push({ path: `history[${i}].name`, message: "History entry name is required" });
                }
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

function importSectionsAndItems(db: Database, listId: number, sections: ExportSectionData[]): void {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        if (!section) continue;

        const sectionName = sanitizeString(section.name, 100);
        if (!sectionName) continue;

        const maxSectionOrder = db.query<{ max: number }, [number]>(
            "SELECT COALESCE(MAX(sort_order), -1) as max FROM sections WHERE list_id = ?"
        ).get(listId);
        const sectionSortOrder = (maxSectionOrder?.max ?? -1) + 1;

        db.query(
            "INSERT INTO sections (list_id, name, sort_order) VALUES (?, ?, ?)"
        ).run(listId, sectionName, sectionSortOrder);

        const newSection = db.query<{ id: number }, []>(
            "SELECT id FROM sections WHERE id = last_insert_rowid()"
        ).get();

        if (!newSection) continue;

        importItemsIntoSection(db, newSection.id, section.items ?? [], 0);
    }
}

function importItemsIntoSection(db: Database, sectionId: number, items: ExportItemData[], startOrder: number): void {
    for (let iIdx = 0; iIdx < items.length; iIdx++) {
        const item = items[iIdx];
        if (!item) continue;

        const itemName = sanitizeString(item.name, 200);
        if (!itemName) continue;

        const description = sanitizeNullableString(item.description, 500);
        const quantity = sanitizeNullableString(item.quantity, 100);
        const status = isValidStatus(item.status) ? item.status : "active";

        db.query(
            "INSERT INTO items (section_id, name, description, quantity, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(sectionId, itemName, description, quantity, status, startOrder + iIdx);
    }
}

function mergeIntoExistingList(
    db: Database,
    listId: number,
    listName: string,
    importSections: ExportSectionData[],
    skipped: string[],
): { merged: boolean } {
    let anyChanges = false;

    const existingSections = db.query<{ id: number; name: string }, [number]>(
        "SELECT id, name FROM sections WHERE list_id = ?"
    ).all(listId);
    const existingSectionMap = new Map(existingSections.map((s) => [s.name.toLowerCase(), s.id]));

    for (const importSection of importSections) {
        const sectionName = sanitizeString(importSection.name, 100);
        if (!sectionName) continue;

        const existingSectionId = existingSectionMap.get(sectionName.toLowerCase());

        if (existingSectionId !== undefined) {
            const existingItems = db.query<{ name: string }, [number]>(
                "SELECT name FROM items WHERE section_id = ?"
            ).all(existingSectionId);
            const existingItemNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

            const maxItemOrder = db.query<{ max: number }, [number]>(
                "SELECT COALESCE(MAX(sort_order), -1) as max FROM items WHERE section_id = ?"
            ).get(existingSectionId);
            let nextOrder = (maxItemOrder?.max ?? -1) + 1;

            const importItems = importSection.items ?? [];
            for (const item of importItems) {
                if (!item) continue;

                const itemName = sanitizeString(item.name, 200);
                if (!itemName) continue;

                if (existingItemNames.has(itemName.toLowerCase())) {
                    skipped.push(`Item "${itemName}" in "${listName} > ${sectionName}" (already exists)`);
                    continue;
                }

                const description = sanitizeNullableString(item.description, 500);
                const quantity = sanitizeNullableString(item.quantity, 100);
                const status = isValidStatus(item.status) ? item.status : "active";

                db.query(
                    "INSERT INTO items (section_id, name, description, quantity, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
                ).run(existingSectionId, itemName, description, quantity, status, nextOrder);

                nextOrder++;
                existingItemNames.add(itemName.toLowerCase());
                anyChanges = true;
            }
        } else {
            const maxSectionOrder = db.query<{ max: number }, [number]>(
                "SELECT COALESCE(MAX(sort_order), -1) as max FROM sections WHERE list_id = ?"
            ).get(listId);
            const sectionSortOrder = (maxSectionOrder?.max ?? -1) + 1;

            db.query(
                "INSERT INTO sections (list_id, name, sort_order) VALUES (?, ?, ?)"
            ).run(listId, sectionName, sectionSortOrder);

            const newSection = db.query<{ id: number }, []>(
                "SELECT id FROM sections WHERE id = last_insert_rowid()"
            ).get();

            if (!newSection) continue;

            importItemsIntoSection(db, newSection.id, importSection.items ?? [], 0);
            existingSectionMap.set(sectionName.toLowerCase(), newSection.id);
            anyChanges = true;
        }
    }

    return { merged: anyChanges };
}

/** Creates the import/export service for exporting lists, templates, and history to JSON, and importing them back with merge or replace strategies. */
export function createImportExportService(db: Database) {
    return {
        getMaxImportSize(): number {
            return MAX_IMPORT_SIZE;
        },

        getExportSummary(): ExportSummary {
            const lists = db.query<DbList & { item_count: number }, []>(
                `SELECT l.*, COALESCE(
                    (SELECT COUNT(*) FROM items i JOIN sections s ON s.id = i.section_id WHERE s.list_id = l.id),
                    0
                ) as item_count FROM lists l ORDER BY sort_order ASC`
            ).all();

            const templates = db.query<DbTemplate & { item_count: number }, []>(
                `SELECT t.*, COALESCE(
                    (SELECT COUNT(*) FROM template_items ti WHERE ti.template_id = t.id),
                    0
                ) as item_count FROM templates t ORDER BY name ASC`
            ).all();

            const historyCount = db.query<{ count: number }, []>(
                "SELECT COUNT(*) as count FROM history"
            ).get()?.count ?? 0;

            return {
                lists: lists.map((l) => ({ id: l.id, name: l.name, icon: l.icon, itemCount: l.item_count })),
                templates: templates.map((t) => ({ id: t.id, name: t.name, itemCount: t.item_count })),
                historyCount,
            };
        },

        exportData(options: ExportOptions): ExportData {
            let lists: DbList[];
            if (options.listIds && options.listIds.length > 0) {
                const placeholders = options.listIds.map(() => "?").join(",");
                lists = db.query<DbList, number[]>(
                    `SELECT * FROM lists WHERE id IN (${placeholders}) ORDER BY sort_order ASC`
                ).all(...options.listIds);
            } else if (options.listIds) {
                lists = [];
            } else {
                lists = db.query<DbList, []>("SELECT * FROM lists ORDER BY sort_order ASC").all();
            }

            const exportLists: ExportListData[] = lists.map((list) => {
                const sections = db.query<DbSection, [number]>(
                    "SELECT * FROM sections WHERE list_id = ? ORDER BY sort_order ASC"
                ).all(list.id);

                const exportSections: ExportSectionData[] = sections.map((section) => {
                    const items = db.query<DbItem, [number]>(
                        "SELECT * FROM items WHERE section_id = ? ORDER BY sort_order ASC"
                    ).all(section.id);

                    return {
                        name: section.name,
                        items: items.map((item) => ({
                            name: item.name,
                            description: item.description,
                            quantity: item.quantity,
                            status: item.status,
                        })),
                    };
                });

                return {
                    name: list.name,
                    icon: list.icon,
                    sections: exportSections,
                };
            });

            let exportTemplates: ExportTemplateData[];
            if (options.templateIds && options.templateIds.length > 0) {
                const placeholders = options.templateIds.map(() => "?").join(",");
                const templates = db.query<DbTemplate, number[]>(
                    `SELECT * FROM templates WHERE id IN (${placeholders}) ORDER BY name ASC`
                ).all(...options.templateIds);

                exportTemplates = templates.map((template) => {
                    const items = db.query<DbTemplateItem, [number]>(
                        "SELECT * FROM template_items WHERE template_id = ? ORDER BY sort_order ASC"
                    ).all(template.id);

                    return {
                        name: template.name,
                        items: items.map((item) => ({
                            name: item.name,
                            description: item.description,
                            quantity: item.quantity,
                            sectionName: item.section_name,
                        })),
                    };
                });
            } else if (options.templateIds) {
                exportTemplates = [];
            } else {
                const templates = db.query<DbTemplate, []>("SELECT * FROM templates ORDER BY name ASC").all();
                exportTemplates = templates.map((template) => {
                    const items = db.query<DbTemplateItem, [number]>(
                        "SELECT * FROM template_items WHERE template_id = ? ORDER BY sort_order ASC"
                    ).all(template.id);

                    return {
                        name: template.name,
                        items: items.map((item) => ({
                            name: item.name,
                            description: item.description,
                            quantity: item.quantity,
                            sectionName: item.section_name,
                        })),
                    };
                });
            }

            let exportHistory: ExportHistoryData[] = [];
            if (options.includeHistory) {
                const historyRows = db.query<DbHistoryEntry, []>(
                    "SELECT * FROM history ORDER BY frequency DESC, last_used DESC"
                ).all();
                exportHistory = historyRows.map((entry) => ({
                    name: entry.name,
                    sectionName: entry.section_name,
                    description: entry.description,
                    quantity: entry.quantity,
                    frequency: entry.frequency,
                }));
            }

            return {
                version: "1.0.0",
                exported_at: new Date().toISOString(),
                lists: exportLists,
                templates: exportTemplates,
                history: exportHistory,
            };
        },

        preview(data: ExportData): ImportPreview {
            const existingLists = db.query<{ name: string }, []>("SELECT name FROM lists").all();
            const existingListNames = new Set(existingLists.map((l) => l.name.toLowerCase()));

            const existingTemplates = db.query<{ name: string }, []>("SELECT name FROM templates").all();
            const existingTemplateNames = new Set(existingTemplates.map((t) => t.name.toLowerCase()));

            const existingListConflicts = data.lists
                .filter((l) => existingListNames.has(l.name.toLowerCase()))
                .map((l) => l.name);

            const existingTemplateConflicts = (data.templates ?? [])
                .filter((t) => existingTemplateNames.has(t.name.toLowerCase()))
                .map((t) => t.name);

            return {
                listCount: data.lists.length,
                templateCount: (data.templates ?? []).length,
                historyCount: (data.history ?? []).length,
                existingListConflicts,
                existingTemplateConflicts,
            };
        },

        importData(data: ExportData, options: ImportOptions): ImportResult {
            const skipped: string[] = [];
            let listsImported = 0;
            let listsMerged = 0;
            let templatesImported = 0;
            let historyImported = 0;

            const doImport = db.transaction(() => {
                if (options.mode === "replace") {
                    if (options.importLists) {
                        db.exec("DELETE FROM items");
                        db.exec("DELETE FROM sections");
                        db.exec("DELETE FROM lists");
                    }
                    if (options.importTemplates) {
                        db.exec("DELETE FROM template_items");
                        db.exec("DELETE FROM templates");
                    }
                    if (options.importHistory) {
                        db.exec("DELETE FROM history");
                    }
                }

                if (options.importLists) {
                    const existingListRows = db.query<{ id: number; name: string }, []>("SELECT id, name FROM lists").all();
                    const existingListMap = new Map(existingListRows.map((l) => [l.name.toLowerCase(), l.id]));

                    for (const list of data.lists) {
                        const listName = sanitizeString(list.name, 100);
                        if (!listName) {
                            skipped.push("List with empty name");
                            continue;
                        }

                        const existingListId = existingListMap.get(listName.toLowerCase());

                        if (options.mode === "merge" && existingListId !== undefined) {
                            const mergeResult = mergeIntoExistingList(db, existingListId, listName, list.sections ?? [], skipped);
                            if (mergeResult.merged) {
                                listsMerged++;
                            }
                            continue;
                        }

                        const icon = sanitizeString(list.icon || "📋", 10);
                        const maxOrder = db.query<{ max: number }, []>(
                            "SELECT COALESCE(MAX(sort_order), 0) as max FROM lists"
                        ).get();
                        const listSortOrder = (maxOrder?.max ?? 0) + 1;

                        db.query(
                            "INSERT INTO lists (name, icon, sort_order, is_active) VALUES (?, ?, ?, 0)"
                        ).run(listName, icon, listSortOrder);

                        const newList = db.query<{ id: number }, []>(
                            "SELECT id FROM lists WHERE id = last_insert_rowid()"
                        ).get();

                        if (!newList) continue;

                        importSectionsAndItems(db, newList.id, list.sections ?? []);

                        listsImported++;
                        existingListMap.set(listName.toLowerCase(), newList.id);
                    }
                }

                if (options.importTemplates && data.templates) {
                    const existingTemplateNames = new Set(
                        db.query<{ name: string }, []>("SELECT name FROM templates").all().map((t) => t.name.toLowerCase())
                    );

                    for (const template of data.templates) {
                        const templateName = sanitizeString(template.name, 100);
                        if (!templateName) {
                            skipped.push("Template with empty name");
                            continue;
                        }

                        if (options.mode === "merge" && existingTemplateNames.has(templateName.toLowerCase())) {
                            skipped.push(`Template "${templateName}" (already exists)`);
                            continue;
                        }

                        db.query("INSERT INTO templates (name) VALUES (?)").run(templateName);

                        const newTemplate = db.query<{ id: number }, []>(
                            "SELECT id FROM templates WHERE id = last_insert_rowid()"
                        ).get();

                        if (!newTemplate) continue;

                        const items = template.items ?? [];
                        for (let iIdx = 0; iIdx < items.length; iIdx++) {
                            const item = items[iIdx];
                            if (!item) continue;

                            const itemName = sanitizeString(item.name, 200);
                            if (!itemName) continue;

                            const description = sanitizeNullableString(item.description, 500);
                            const quantity = sanitizeNullableString(item.quantity, 100);
                            const sectionName = sanitizeNullableString(item.sectionName, 100);

                            db.query(
                                "INSERT INTO template_items (template_id, name, description, quantity, section_name, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
                            ).run(newTemplate.id, itemName, description, quantity, sectionName, iIdx);
                        }

                        templatesImported++;
                        existingTemplateNames.add(templateName.toLowerCase());
                    }
                }

                if (options.importHistory && data.history) {
                    const existingHistoryNames = new Set(
                        db.query<{ name: string }, []>("SELECT name FROM history").all().map((h) => h.name.toLowerCase())
                    );

                    for (const entry of data.history) {
                        const entryName = sanitizeString(entry.name, 200);
                        if (!entryName) {
                            skipped.push("History entry with empty name");
                            continue;
                        }

                        if (options.mode === "merge" && existingHistoryNames.has(entryName.toLowerCase())) {
                            skipped.push(`History "${entryName}" (already exists)`);
                            continue;
                        }

                        const sectionName = sanitizeNullableString(entry.sectionName, 100);
                        const description = sanitizeNullableString(entry.description, 500);
                        const quantity = sanitizeNullableString(entry.quantity, 100);
                        const frequency = typeof entry.frequency === "number" && entry.frequency > 0 ? entry.frequency : 1;

                        db.query(
                            "INSERT INTO history (name, section_name, description, quantity, frequency) VALUES (?, ?, ?, ?, ?)"
                        ).run(entryName, sectionName, description, quantity, frequency);

                        historyImported++;
                        existingHistoryNames.add(entryName.toLowerCase());
                    }
                }

                return { listsImported, listsMerged, templatesImported, historyImported, skipped };
            });

            return doImport();
        },
    };
}

export type ImportExportService = ReturnType<typeof createImportExportService>;
