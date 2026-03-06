import type { Database } from "bun:sqlite";
import type { Item, ItemStatus, HistoryEntry } from "shared/dist";
import { fuzzySearch, type ScoredEntry } from "../utils/fuzzy-search";

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

type DbHistoryEntry = {
    id: number;
    name: string;
    section_name: string | null;
    description: string | null;
    quantity: string | null;
    frequency: number;
    last_used: string;
};

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

function mapHistoryEntry(row: DbHistoryEntry): HistoryEntry {
    return {
        id: row.id,
        name: row.name,
        sectionName: row.section_name,
        description: row.description,
        quantity: row.quantity,
        frequency: row.frequency,
        lastUsed: row.last_used,
    };
}

export function createItemsService(db: Database) {
    return {
        getById(id: number): Item | null {
            const row = db.query<DbItem, [number]>("SELECT * FROM items WHERE id = ?").get(id);
            return row ? mapItem(row) : null;
        },

        create(sectionId: number, name: string, description?: string, quantity?: string): Item {
            const maxOrder = db
                .query<{ max: number }, [number]>("SELECT COALESCE(MAX(sort_order), 0) as max FROM items WHERE section_id = ?")
                .get(sectionId);
            const sortOrder = (maxOrder?.max ?? 0) + 1;

            db.query(
                "INSERT INTO items (section_id, name, description, quantity, sort_order) VALUES (?, ?, ?, ?, ?)"
            ).run(sectionId, name, description ?? null, quantity ?? null, sortOrder);

            const row = db.query<DbItem, []>("SELECT * FROM items WHERE id = last_insert_rowid()").get();
            if (!row) {
                throw new Error("Failed to create item");
            }

            this.updateHistory(name, description, quantity, sectionId);
            return mapItem(row);
        },

        update(
            id: number,
            data: { name?: string; description?: string | null; quantity?: string | null; status?: ItemStatus }
        ): Item | null {
            const item = this.getById(id);
            if (!item) return null;

            const updates: string[] = ["updated_at = datetime('now')"];
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
            if (data.status !== undefined) {
                updates.push("status = ?");
                values.push(data.status);
            }

            if (updates.length === 1) return item;

            values.push(id);
            db.query(`UPDATE items SET ${updates.join(", ")} WHERE id = ?`).run(...values);

            return this.getById(id);
        },

        moveToSection(id: number, targetSectionId: number): Item | null {
            const item = this.getById(id);
            if (!item) return null;

            const maxOrder = db
                .query<{ max: number }, [number]>("SELECT COALESCE(MAX(sort_order), 0) as max FROM items WHERE section_id = ?")
                .get(targetSectionId);
            const sortOrder = (maxOrder?.max ?? 0) + 1;

            db.query("UPDATE items SET section_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(
                targetSectionId,
                sortOrder,
                id
            );

            return this.getById(id);
        },

        reorder(itemIds: number[]): void {
            db.transaction(() => {
                itemIds.forEach((id, index) => {
                    db.query("UPDATE items SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(index, id);
                });
            })();
        },

        delete(id: number): boolean {
            const result = db.query("DELETE FROM items WHERE id = ?").run(id);
            return result.changes > 0;
        },

        deleteCompletedInSection(sectionId: number): number {
            const result = db.query("DELETE FROM items WHERE section_id = ? AND status = 'completed'").run(sectionId);
            return result.changes;
        },

        updateHistory(name: string, description?: string, quantity?: string, sectionId?: number): void {
            let sectionName: string | null = null;
            if (sectionId) {
                const section = db.query<{ name: string }, [number]>("SELECT name FROM sections WHERE id = ?").get(sectionId);
                sectionName = section?.name ?? null;
            }

            const existing = db.query<DbHistoryEntry, [string]>("SELECT * FROM history WHERE name = ?").get(name);

            if (existing) {
                db.query(
                    "UPDATE history SET frequency = frequency + 1, last_used = datetime('now'), section_name = ?, description = ?, quantity = ? WHERE name = ?"
                ).run(sectionName, description ?? null, quantity ?? null, name);
            } else {
                db.query(
                    "INSERT INTO history (name, section_name, description, quantity, frequency) VALUES (?, ?, ?, ?, 1)"
                ).run(name, sectionName, description ?? null, quantity ?? null);
            }
        },

        getHistory(limit: number = 100): HistoryEntry[] {
            const rows = db.query<DbHistoryEntry, [number]>("SELECT * FROM history ORDER BY frequency DESC, last_used DESC LIMIT ?").all(limit);
            return rows.map(mapHistoryEntry);
        },

        searchHistory(query: string, limit: number = 5): HistoryEntry[] {
            if (!query || query.length < 2) return [];

            const allHistory = db.query<DbHistoryEntry, []>("SELECT * FROM history").all();

            const normalizedQuery = query.toLowerCase();
            const seen = new Map<string, DbHistoryEntry>();

            for (const row of allHistory) {
                const normalizedName = row.name.toLowerCase();
                if (!seen.has(normalizedName)) {
                    seen.set(normalizedName, row);
                } else {
                    const existing = seen.get(normalizedName)!;
                    existing.frequency += row.frequency;
                    if (new Date(row.last_used) > new Date(existing.last_used)) {
                        existing.last_used = row.last_used;
                    }
                }
            }

            const deduplicated = Array.from(seen.values());

            const scored: ScoredEntry<DbHistoryEntry>[] = fuzzySearch(
                query,
                deduplicated,
                (row) => row.name,
                0.5
            );

            const ranked = scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const aFreq = a.item.frequency;
                const bFreq = b.item.frequency;
                if (bFreq !== aFreq) return bFreq - aFreq;
                return new Date(b.item.last_used).getTime() - new Date(a.item.last_used).getTime();
            });

            return ranked.slice(0, limit).map((s) => mapHistoryEntry(s.item));
        },
    };
}

export type ItemsService = ReturnType<typeof createItemsService>;
