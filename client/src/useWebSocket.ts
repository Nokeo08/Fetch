import { createContext, useContext } from "react";

export type SyncStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export type WebSocketMessage = {
    type: string;
    data: unknown;
    timestamp: string;
    clientId: string;
};

type MessageHandler = (message: WebSocketMessage) => void;

export const WebSocketContext = createContext<{
    status: SyncStatus;
    clientId: string | null;
    send: (type: string, data: unknown) => void;
    subscribe: (handler: MessageHandler) => () => void;
}>({
    status: "disconnected",
    clientId: null,
    send: () => {},
    subscribe: () => () => {},
});

export function useWebSocket() {
    return useContext(WebSocketContext);
}

export function useSyncStatus() {
    const { status } = useWebSocket();
    return status;
}
