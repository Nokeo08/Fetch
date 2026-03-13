import { createContext, useContext } from "react";
import type { OperationType } from "./operationQueue";

export type OfflineStatus = "online" | "offline" | "syncing";

type OfflineContextType = {
    status: OfflineStatus;
    pendingCount: number;
    lastSyncTime: Date | null;
    queueOperation: (type: OperationType, data: unknown) => Promise<void>;
    syncNow: () => Promise<void>;
    isOnline: boolean;
    savePreference: (key: string, value: unknown) => Promise<void>;
    getPreference: <T>(key: string) => Promise<T | null>;
};

export const OfflineContext = createContext<OfflineContextType>({
    status: "online",
    pendingCount: 0,
    lastSyncTime: null,
    queueOperation: async () => {},
    syncNow: async () => {},
    isOnline: true,
    savePreference: async () => {},
    getPreference: async () => null,
});

export function useOffline() {
    return useContext(OfflineContext);
}
