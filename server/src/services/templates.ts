import type { Database } from "bun:sqlite";
import type { Template, TemplateItem } from "shared/dist";

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

function mapTemplate(row: DbTemplate): Template {
    return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
    };
}

function mapTemplateItem(row: DbTemplateItem): TemplateItem {
    return {
        id: row.id,
        templateId: row.template_id,
        name: row.name,
        description: row.description,
        quantity: row.quantity,
        sectionName: row.section_name,
        sortOrder: row.sort_order,
    };
}

export type TemplateWithItems = Template & {
    items: TemplateItem[];
};

export function createTemplatesService(db: Database) {
    return {
        getAll(): Template[] {
            const rows = db.query<DbTemplate, []>("SELECT * FROM templates ORDER BY name ASC").all();
            return rows.map(mapTemplate);
        },

        getAllWithItems(): TemplateWithItems[] {
            const templates = this.getAll();
            return templates.map((template) => ({
                ...template,
                items: this.getItems(template.id),
            }));
        },

        getById(id: number): Template | null {
            const row = db.query<DbTemplate, [number]>("SELECT * FROM templates WHERE id = ?").get(id);
            return row ? mapTemplate(row) : null;
        },

        getByIdWithItems(id: number): TemplateWithItems | null {
            const template = this.getById(id);
            if (!template) return null;
            return {
                ...template,
                items: this.getItems(id),
            };
        },

        create(name: string): Template {
            db.query("INSERT INTO templates (name) VALUES (?)").run(name);

            const row = db.query<DbTemplate, []>("SELECT * FROM templates WHERE id = last_insert_rowid()").get();
            if (!row) {
                throw new Error("Failed to create template");
            }
            return mapTemplate(row);
        },

        update(id: number, name: string): Template | null {
            const template = this.getById(id);
            if (!template) return null;

            db.query("UPDATE templates SET name = ? WHERE id = ?").run(name, id);
            return this.getById(id);
        },

        delete(id: number): boolean {
            const result = db.query("DELETE FROM templates WHERE id = ?").run(id);
            return result.changes > 0;
        },

        getItems(templateId: number): TemplateItem[] {
            const rows = db
                .query<DbTemplateItem, [number]>("SELECT * FROM template_items WHERE template_id = ? ORDER BY sort_order ASC")
                .all(templateId);
            return rows.map(mapTemplateItem);
        },

        addItem(
            templateId: number,
            name: string,
            options?: { description?: string; quantity?: string; sectionName?: string }
        ): TemplateItem {
            const maxOrder = db
                .query<{ max: number }, [number]>("SELECT COALESCE(MAX(sort_order), 0) as max FROM template_items WHERE template_id = ?")
                .get(templateId);
            const sortOrder = (maxOrder?.max ?? 0) + 1;

            db.query(
                "INSERT INTO template_items (template_id, name, description, quantity, section_name, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(templateId, name, options?.description ?? null, options?.quantity ?? null, options?.sectionName ?? null, sortOrder);

            const row = db.query<DbTemplateItem, []>("SELECT * FROM template_items WHERE id = last_insert_rowid()").get();
            if (!row) {
                throw new Error("Failed to add template item");
            }
            return mapTemplateItem(row);
        },

        updateItem(id: number, data: { name?: string; description?: string | null; quantity?: string | null; sectionName?: string | null }): TemplateItem | null {
            const row = db.query<DbTemplateItem, [number]>("SELECT * FROM template_items WHERE id = ?").get(id);
            if (!row) return null;

            const updates: string[] = [];
            const values: (string | number | null)[] = [];

            if (data.name !== undefined) {
                updates.push("name = ?");
                values.push(data.name);
            }
            if (data.description !== undefined) {
                updates.push("description = ?");
                values.push(data.description);
            }
            if (data.quantity !== undefined) {
                updates.push("quantity = ?");
                values.push(data.quantity);
            }
            if (data.sectionName !== undefined) {
                updates.push("section_name = ?");
                values.push(data.sectionName);
            }

            if (updates.length === 0) return mapTemplateItem(row);

            values.push(id);
            db.query(`UPDATE template_items SET ${updates.join(", ")} WHERE id = ?`).run(...values);

            const updated = db.query<DbTemplateItem, [number]>("SELECT * FROM template_items WHERE id = ?").get(id);
            return updated ? mapTemplateItem(updated) : null;
        },

        deleteItem(id: number): boolean {
            const result = db.query("DELETE FROM template_items WHERE id = ?").run(id);
            return result.changes > 0;
        },

        reorderItems(templateId: number, itemIds: number[]): void {
            db.transaction(() => {
                itemIds.forEach((id, index) => {
                    db.query("UPDATE template_items SET sort_order = ? WHERE id = ? AND template_id = ?").run(index, id, templateId);
                });
            })();
        },

        getItemCount(templateId: number): number {
            const result = db.query<{ count: number }, [number]>("SELECT COUNT(*) as count FROM template_items WHERE template_id = ?").get(templateId);
            return result?.count ?? 0;
        },
    };
}

export type TemplatesService = ReturnType<typeof createTemplatesService>;
