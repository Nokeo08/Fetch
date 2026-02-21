export type WebSocketMessage =
    | { type: "item_created"; data: { item: import("./entities").Item } }
    | { type: "item_updated"; data: { item: import("./entities").Item } }
    | { type: "item_deleted"; data: { itemId: number } }
    | { type: "item_moved"; data: { item: import("./entities").Item } }
    | { type: "section_created"; data: { section: import("./entities").Section } }
    | { type: "section_updated"; data: { section: import("./entities").Section } }
    | { type: "section_deleted"; data: { sectionId: number } }
    | { type: "list_created"; data: { list: import("./entities").ShoppingList } }
    | { type: "list_updated"; data: { list: import("./entities").ShoppingList } }
    | { type: "list_deleted"; data: { listId: number } }
    | { type: "sync_required"; data: { timestamp: number } };

export type SyncStatus = "connected" | "disconnected" | "syncing" | "error";
