import { useEffect, useCallback } from "react";
import { useWebSocket, type WebSocketMessage } from "./useWebSocket";
import type { SectionWithItems, Item } from "./api/sections";

export function useRealtimeUpdates(
    setSections: React.Dispatch<React.SetStateAction<SectionWithItems[]>>
) {
    const { subscribe } = useWebSocket();

    const handleMessage = useCallback(
        (message: WebSocketMessage) => {
            switch (message.type) {
                case "item_created": {
                    const item = message.data as Item;
                    setSections((prev) => {
                        const section = prev.find((s) => s.id === item.sectionId);
                        if (!section) return prev;

                        const itemExists = section.items.some((i) => i.id === item.id);
                        if (itemExists) return prev;

                        return prev.map((s) =>
                            s.id === item.sectionId
                                ? { ...s, items: [...s.items, item] }
                                : s
                        );
                    });
                    break;
                }

                case "item_updated": {
                    const item = message.data as Item;
                    setSections((prev) =>
                        prev.map((s) => ({
                            ...s,
                            items: s.items.map((i) => (i.id === item.id ? { ...i, ...item } : i),
                            ),
                        }))
                    );
                    break;
                }

                case "item_deleted": {
                    const { id } = message.data as { id: number };
                    setSections((prev) =>
                        prev.map((s) => ({
                            ...s,
                            items: s.items.filter((i) => i.id !== id),
                        }))
                    );
                    break;
                }

                case "item_moved": {
                    const item = message.data as Item;
                    setSections((prev) => {
                        let updated = prev.map((s) => ({
                            ...s,
                            items: s.items.filter((i) => i.id !== item.id),
                        }));

                        const targetSection = updated.find((s) => s.id === item.sectionId);
                        if (targetSection) {
                            const itemExists = targetSection.items.some((i) => i.id === item.id);
                            if (!itemExists) {
                                updated = updated.map((s) =>
                                    s.id === item.sectionId
                                        ? { ...s, items: [...s.items, item] }
                                        : s
                                );
                            }
                        }

                        return updated;
                    });
                    break;
                }

                case "section_created": {
                    const section = message.data as SectionWithItems;
                    setSections((prev) => {
                        const exists = prev.some((s) => s.id === section.id);
                        if (exists) return prev;
                        return [...prev, { ...section, items: [] }];
                    });
                    break;
                }

                case "section_updated": {
                    const section = message.data as SectionWithItems;
                    setSections((prev) =>
                        prev.map((s) => (s.id === section.id ? { ...s, name: section.name } : s))
                    );
                    break;
                }

                case "section_deleted": {
                    const { id } = message.data as { id: number };
                    setSections((prev) => prev.filter((s) => s.id !== id));
                    break;
                }
            }
        },
        [setSections]
    );

    useEffect(() => {
        const unsubscribe = subscribe(handleMessage);
        return unsubscribe;
    }, [subscribe, handleMessage]);
}
