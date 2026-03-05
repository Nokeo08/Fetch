import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "fetch-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("operations")) {
                    const store = db.createObjectStore("operations", {
                        keyPath: "id",
                    });
                    store.createIndex("timestamp", "timestamp");
                }
            },
        });
    }
    return dbPromise;
}

export type OperationType =
    | "create_list"
    | "update_list"
    | "delete_list"
    | "activate_list"
    | "reorder_lists"
    | "create_section"
    | "update_section"
    | "delete_section"
    | "reorder_sections"
    | "create_item"
    | "update_item"
    | "delete_item"
    | "move_item"
    | "reorder_items";

export type QueuedOperation = {
    id: string;
    type: OperationType;
    data: unknown;
    timestamp: string;
    retryCount: number;
    status: "pending" | "failed";
};

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const operationQueue = {
    async add(type: OperationType, data: unknown): Promise<string> {
        const db = await getDb();
        const operation: QueuedOperation = {
            id: generateId(),
            type,
            data,
            timestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
        };

        await db.put("operations", operation);
        return operation.id;
    },

    async getAll(): Promise<QueuedOperation[]> {
        const db = await getDb();
        return db.getAllFromIndex("operations", "timestamp");
    },

    async getPending(): Promise<QueuedOperation[]> {
        const ops = await this.getAll();
        return ops.filter((op) => op.status === "pending");
    },

    async getCount(): Promise<number> {
        const pending = await this.getPending();
        return pending.length;
    },

    async remove(id: string): Promise<void> {
        const db = await getDb();
        await db.delete("operations", id);
    },

    async updateRetryCount(id: string): Promise<void> {
        const db = await getDb();
        const operation = await db.get("operations", id);
        if (operation) {
            operation.retryCount += 1;
            if (operation.retryCount >= 5) {
                operation.status = "failed";
            }
            await db.put("operations", operation);
        }
    },

    async clear(): Promise<void> {
        const db = await getDb();
        await db.clear("operations");
    },

    async processQueue(
        processor: (op: QueuedOperation) => Promise<void>,
    ): Promise<{ success: number; failed: number }> {
        const pending = await this.getPending();
        let success = 0;
        let failed = 0;

        for (const op of pending) {
            try {
                await processor(op);
                await this.remove(op.id);
                success++;
            } catch {
                await this.updateRetryCount(op.id);
                failed++;
                break;
            }
        }

        return { success, failed };
    },
};
