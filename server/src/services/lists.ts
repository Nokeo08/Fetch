import type { Database } from "bun:sqlite";
import type { ShoppingList, ListWithCounts } from "shared/dist";

type DbList = {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    is_active: number;
    created_at: string;
};

type DbListWithCounts = DbList & {
    itemCount: number;
    sectionCount: number;
};

function mapList(row: DbList): ShoppingList {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        sortOrder: row.sort_order,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
    };
}

function mapListWithCounts(row: DbListWithCounts): ListWithCounts {
    return {
        ...mapList(row),
        itemCount: row.itemCount,
        sectionCount: row.sectionCount,
    };
}

export function createListsService(db: Database) {
    return {
        getAll(): ListWithCounts[] {
            const rows = db
                .query<DbListWithCounts, []>(`
                SELECT l.*, 
                    COUNT(DISTINCT i.id) as itemCount,
                    COUNT(DISTINCT s.id) as sectionCount
                FROM lists l
                LEFT JOIN sections s ON s.list_id = l.id
                LEFT JOIN items i ON i.section_id = s.id
                GROUP BY l.id
                ORDER BY l.sort_order ASC
            `)
                .all();
            return rows.map(mapListWithCounts);
        },

        getById(id: number): ShoppingList | null {
            const row = db.query<DbList, [number]>("SELECT * FROM lists WHERE id = ?").get(id);
            return row ? mapList(row) : null;
        },

        getActive(): ShoppingList | null {
            const row = db.query<DbList, []>("SELECT * FROM lists WHERE is_active = 1 LIMIT 1").get();
            return row ? mapList(row) : null;
        },

        create(name: string, icon: string = "📋"): ShoppingList {
            const maxOrder = db.query<{ max: number }, []>("SELECT COALESCE(MAX(sort_order), 0) as max FROM lists").get();
            const sortOrder = (maxOrder?.max ?? 0) + 1;

            db.query(
                "INSERT INTO lists (name, icon, sort_order, is_active) VALUES (?, ?, ?, 1)"
            ).run(name, icon, sortOrder);

            const row = db.query<DbList, []>("SELECT * FROM lists WHERE id = last_insert_rowid()").get();
            if (!row) {
                throw new Error("Failed to create list");
            }
            return mapList(row);
        },

        update(id: number, data: { name?: string; icon?: string; isActive?: boolean }): ShoppingList | null {
            const list = this.getById(id);
            if (!list) return null;

            const updates: string[] = [];
            const values: (string | number)[] = [];

            if (data.name !== undefined) {
                updates.push("name = ?");
                values.push(data.name);
            }
            if (data.icon !== undefined) {
                updates.push("icon = ?");
                values.push(data.icon);
            }
            if (data.isActive !== undefined) {
                updates.push("is_active = ?");
                values.push(data.isActive ? 1 : 0);
            }

            if (updates.length === 0) return list;

            values.push(id);
            db.query(`UPDATE lists SET ${updates.join(", ")} WHERE id = ?`).run(...values);

            return this.getById(id);
        },

        setActive(id: number): ShoppingList | null {
            const list = this.getById(id);
            if (!list) return null;

            db.exec("UPDATE lists SET is_active = 0");
            db.query("UPDATE lists SET is_active = 1 WHERE id = ?").run(id);

            return this.getById(id);
        },

        reorder(ids: number[]): void {
            db.transaction(() => {
                ids.forEach((id, index) => {
                    db.query("UPDATE lists SET sort_order = ? WHERE id = ?").run(index, id);
                });
            })();
        },

        delete(id: number): boolean {
            const result = db.query("DELETE FROM lists WHERE id = ?").run(id);
            return result.changes > 0;
        },
    };
}

export type ListsService = ReturnType<typeof createListsService>;
