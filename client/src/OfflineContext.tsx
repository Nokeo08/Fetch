import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { operationQueue, type QueuedOperation, type OperationType } from "./operationQueue";

export type OfflineStatus = "online" | "offline" | "syncing";

type OfflineContextType = {
    status: OfflineStatus;
    pendingCount: number;
    lastSyncTime: Date | null;
    queueOperation: (type: OperationType, data: unknown) => Promise<void>;
    syncNow: () => Promise<void>;
    isOnline: boolean;
};

const OfflineContext = createContext<OfflineContextType>({
    status: "online",
    pendingCount: 0,
    lastSyncTime: null,
    queueOperation: async () => {},
    syncNow: async () => {},
    isOnline: true,
});

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    return res.json() as Promise<T>;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<OfflineStatus>("online");
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const syncInProgressRef = useRef(false);

    const updatePendingCount = useCallback(async () => {
        const count = await operationQueue.getCount();
        setPendingCount(count);
    }, []);

    const processOperation = useCallback(async (op: QueuedOperation): Promise<void> => {
        let path = "";
        let method = "POST";
        let body = op.data;

        switch (op.type) {
            case "create_list":
                path = "/api/v1/lists";
                break;
            case "update_list":
                path = `/api/v1/lists/${(op.data as { id: number }).id}`;
                method = "PUT";
                break;
            case "delete_list":
                path = `/api/v1/lists/${(op.data as { id: number }).id}`;
                method = "DELETE";
                body = undefined;
                break;
            case "activate_list":
                path = `/api/v1/lists/${(op.data as { id: number }).id}/activate`;
                break;
            case "reorder_lists":
                path = "/api/v1/lists/reorder";
                break;
            case "create_section":
                path = `/api/v1/lists/${(op.data as { listId: number })}/sections`;
                break;
            case "update_section":
                path = `/api/v1/sections/${(op.data as { id: number }).id}`;
                method = "PUT";
                break;
            case "delete_section":
                path = `/api/v1/sections/${(op.data as { id: number }).id}`;
                method = "DELETE";
                body = undefined;
                break;
            case "reorder_sections":
                path = "/api/v1/sections/reorder";
                break;
            case "create_item":
                path = `/api/v1/sections/${(op.data as { sectionId: number })}/items`;
                break;
            case "update_item":
                path = `/api/v1/items/${(op.data as { id: number }).id}`;
                method = "PUT";
                break;
            case "delete_item":
                path = `/api/v1/items/${(op.data as { id: number }).id}`;
                method = "DELETE";
                body = undefined;
                break;
            case "move_item":
                path = `/api/v1/items/${(op.data as { id: number }).id}/move`;
                break;
            case "reorder_items":
                path = "/api/v1/items/reorder";
                break;
            default:
                throw new Error(`Unknown operation type: ${op.type}`);
        }

        await fetchApi(path, {
            method,
            body: body ? JSON.stringify(body) : undefined,
        });
    }, []);

    const syncNow = useCallback(async () => {
        if (!isOnline || syncInProgressRef.current) {
            return;
        }

        syncInProgressRef.current = true;
        setStatus("syncing");

        try {
            const result = await operationQueue.processQueue(processOperation);

            if (result.success > 0 || result.failed === 0) {
                setLastSyncTime(new Date());
            }
        } catch (err) {
            console.error("[Offline] Sync failed:", err);
        } finally {
            setStatus(isOnline ? "online" : "offline");
            syncInProgressRef.current = false;
            await updatePendingCount();
        }
    }, [isOnline, processOperation, updatePendingCount]);

    const queueOperation = useCallback(async (type: OperationType, data: unknown) => {
        await operationQueue.add(type, data);
        await updatePendingCount();

        if (isOnline) {
            await syncNow();
        }
    }, [isOnline, syncNow, updatePendingCount]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setStatus("online");
            syncNow();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setStatus("offline");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [syncNow]);

    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isOnline && pendingCount > 0) {
                syncNow();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOnline, pendingCount, syncNow]);

    return (
        <OfflineContext.Provider
            value={{
                status,
                pendingCount,
                lastSyncTime,
                queueOperation,
                syncNow,
                isOnline,
            }}
        >
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    return useContext(OfflineContext);
}
