const DB_NAME = "fetch-offline";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
    if (db) {
        return db;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            if (!database.objectStoreNames.contains("lists")) {
                database.createObjectStore("lists", { keyPath: "id" });
            }

            if (!database.objectStoreNames.contains("sections")) {
                const sectionsStore = database.createObjectStore("sections", { keyPath: "id" });
                sectionsStore.createIndex("listId", "listId", { unique: false });
            }

            if (!database.objectStoreNames.contains("items")) {
                const itemsStore = database.createObjectStore("items", { keyPath: "id" });
                itemsStore.createIndex("sectionId", "sectionId", { unique: false });
            }

            if (!database.objectStoreNames.contains("operations")) {
                const opsStore = database.createObjectStore("operations", { keyPath: "id" });
                opsStore.createIndex("timestamp", "timestamp", { unique: false });
            }

            if (!database.objectStoreNames.contains("preferences")) {
                database.createObjectStore("preferences", { keyPath: "key" });
            }
        };
    });
}

export type ShoppingList = {
    id: number;
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
};

export type Section = {
    id: number;
    listId: number;
    name: string;
    sortOrder: number;
    createdAt: string;
};

export type Item = {
    id: number;
    sectionId: number;
    name: string;
    description: string | null;
    quantity: string | null;
    status: "active" | "completed" | "uncertain";
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export const offlineDb = {
    async saveLists(lists: ShoppingList[]): Promise<void> {
        const database = await openDB();
        const tx = database.transaction("lists", "readwrite");
        const store = tx.objectStore("lists");

        for (const list of lists) {
            store.put(list);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getLists(): Promise<ShoppingList[]> {
        const database = await openDB();
        const tx = database.transaction("lists", "readonly");
        const store = tx.objectStore("lists");

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveSections(sections: Section[]): Promise<void> {
        const database = await openDB();
        const tx = database.transaction("sections", "readwrite");
        const store = tx.objectStore("sections");

        for (const section of sections) {
            store.put(section);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getSections(): Promise<Section[]> {
        const database = await openDB();
        const tx = database.transaction("sections", "readonly");
        const store = tx.objectStore("sections");

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveItems(items: Item[]): Promise<void> {
        const database = await openDB();
        const tx = database.transaction("items", "readwrite");
        const store = tx.objectStore("items");

        for (const item of items) {
            store.put(item);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getItems(): Promise<Item[]> {
        const database = await openDB();
        const tx = database.transaction("items", "readonly");
        const store = tx.objectStore("items");

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll(): Promise<void> {
        const database = await openDB();
        const stores = ["lists", "sections", "items", "operations", "preferences"];

        await Promise.all(
            stores.map((storeName) => {
                return new Promise<void>((resolve, reject) => {
                    const tx = database.transaction(storeName, "readwrite");
                    const store = tx.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }),
        );
    },

    async setPreference(key: string, value: unknown): Promise<void> {
        const database = await openDB();
        const tx = database.transaction("preferences", "readwrite");
        const store = tx.objectStore("preferences");

        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getPreference<T>(key: string): Promise<T | null> {
        const database = await openDB();
        const tx = database.transaction("preferences", "readonly");
        const store = tx.objectStore("preferences");

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? (result.value as T) : null);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async removePreference(key: string): Promise<void> {
        const database = await openDB();
        const tx = database.transaction("preferences", "readwrite");
        const store = tx.objectStore("preferences");

        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
};
