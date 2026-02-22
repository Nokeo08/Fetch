import type { Item, Section } from "shared/dist";
import { broadcastUpdate } from "../websocket";

export function broadcastItemCreated(item: Item): void {
    broadcastUpdate({ type: "item_created", data: item });
}

export function broadcastItemUpdated(item: Item): void {
    broadcastUpdate({ type: "item_updated", data: item });
}

export function broadcastItemDeleted(itemId: number): void {
    broadcastUpdate({ type: "item_deleted", data: { id: itemId } });
}

export function broadcastItemMoved(item: Item): void {
    broadcastUpdate({ type: "item_moved", data: item });
}

export function broadcastSectionCreated(section: Section): void {
    broadcastUpdate({ type: "section_created", data: section });
}

export function broadcastSectionUpdated(section: Section): void {
    broadcastUpdate({ type: "section_updated", data: section });
}

export function broadcastSectionDeleted(sectionId: number): void {
    broadcastUpdate({ type: "section_deleted", data: { id: sectionId } });
}

export function broadcastSectionReordered(sectionIds: number[]): void {
    broadcastUpdate({ type: "section_reordered", data: { ids: sectionIds } });
}

export function broadcastListCreated(list: { id: number; name: string; icon: string; sortOrder: number; isActive: boolean; createdAt: string }): void {
    broadcastUpdate({ type: "list_created", data: list });
}

export function broadcastListUpdated(list: { id: number; name: string; icon: string; sortOrder: number; isActive: boolean; createdAt: string }): void {
    broadcastUpdate({ type: "list_updated", data: list });
}

export function broadcastListDeleted(listId: number): void {
    broadcastUpdate({ type: "list_deleted", data: { id: listId } });
}
