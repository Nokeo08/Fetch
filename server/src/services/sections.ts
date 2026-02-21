import type { Database } from "bun:sqlite";
import type { Section, SectionWithItems, Item } from "shared/dist";

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

function mapSection(row: DbSection): Section {
    return {
        id: row.id,
        listId: row.list_id,
        name: row.name,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
    };
}

function mapItem(row: DbItem): Item {
    return {
        id: row.id,
        sectionId: row.section_id,
        name: row.name,
        description: row.description,
        quantity: row.quantity,
        status: row.status as Item["status"],
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function createSectionsService(db: Database) {
    return {
        getByListId(listId: number): Section[] {
            const rows = db.query<DbSection, [number]>("SELECT * FROM sections WHERE list_id = ? ORDER BY sort_order ASC").all(listId);
            return rows.map(mapSection);
        },

        getByListIdWithItems(listId: number): SectionWithItems[] {
            const sections = this.getByListId(listId);
            return sections.map((section) => ({
                ...section,
                items: this.getItems(section.id),
            }));
        },

        getItems(sectionId: number): Item[] {
            const rows = db
                .query<DbItem, [number]>(
                    "SELECT * FROM items WHERE section_id = ? ORDER BY sort_order ASC, created_at ASC"
                )
                .all(sectionId);
            return rows.map(mapItem);
        },

        getById(id: number): Section | null {
            const row = db.query<DbSection, [number]>("SELECT * FROM sections WHERE id = ?").get(id);
            return row ? mapSection(row) : null;
        },

        create(listId: number, name: string): Section {
            const maxOrder = db
                .query<{ max: number }, [number]>("SELECT COALESCE(MAX(sort_order), 0) as max FROM sections WHERE list_id = ?")
                .get(listId);
            const sortOrder = (maxOrder?.max ?? 0) + 1;

            db.query(
                "INSERT INTO sections (list_id, name, sort_order) VALUES (?, ?, ?)"
            ).run(listId, name, sortOrder);

            const row = db.query<DbSection, []>("SELECT * FROM sections WHERE id = last_insert_rowid()").get();
            if (!row) {
                throw new Error("Failed to create section");
            }
            return mapSection(row);
        },

        update(id: number, name: string): Section | null {
            const section = this.getById(id);
            if (!section) return null;

            db.query("UPDATE sections SET name = ? WHERE id = ?").run(name, id);
            return this.getById(id);
        },

        reorder(sectionIds: number[]): void {
            db.transaction(() => {
                sectionIds.forEach((id, index) => {
                    db.query("UPDATE sections SET sort_order = ? WHERE id = ?").run(index, id);
                });
            })();
        },

        delete(id: number): boolean {
            const result = db.query("DELETE FROM sections WHERE id = ?").run(id);
            return result.changes > 0;
        },

        getItemCount(sectionId: number): number {
            const result = db.query<{ count: number }, [number]>("SELECT COUNT(*) as count FROM items WHERE section_id = ?").get(sectionId);
            return result?.count ?? 0;
        },
    };
}

export type SectionsService = ReturnType<typeof createSectionsService>;
