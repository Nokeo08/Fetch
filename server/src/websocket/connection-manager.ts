import type { ServerWebSocket } from "bun";

export type WebSocketData = unknown;

export type WebSocketMessage = {
    type: string;
    data: unknown;
    timestamp: string;
    clientId: string;
};

export type ConnectedClient = {
    id: string;
    ws: ServerWebSocket<WebSocketData>;
    connectedAt: Date;
    lastPing: Date;
};

export type BroadcastMessage = {
    type: "item_created" | "item_updated" | "item_deleted" | "item_moved" | "section_created" | "section_updated" | "section_deleted" | "section_reordered" | "list_created" | "list_updated" | "list_deleted";
    data: unknown;
};

export function createConnectionManager() {
    const clients = new Map<string, ConnectedClient>();

    return {
        addClient(id: string, ws: ServerWebSocket<WebSocketData>): void {
            clients.set(id, {
                id,
                ws,
                connectedAt: new Date(),
                lastPing: new Date(),
            });
        },

        removeClient(id: string): void {
            clients.delete(id);
        },

        getClient(id: string): ConnectedClient | undefined {
            return clients.get(id);
        },

        updatePing(id: string): void {
            const client = clients.get(id);
            if (client) {
                client.lastPing = new Date();
            }
        },

        getConnectedClientIds(): string[] {
            return Array.from(clients.keys());
        },

        getClientCount(): number {
            return clients.size;
        },

        broadcast(message: BroadcastMessage, excludeClientId?: string): void {
            const wsMessage: WebSocketMessage = {
                type: message.type,
                data: message.data,
                timestamp: new Date().toISOString(),
                clientId: excludeClientId || "server",
            };

            const messageStr = JSON.stringify(wsMessage);

            for (const [id, client] of clients) {
                if (id !== excludeClientId) {
                    try {
                        client.ws.send(messageStr);
                    } catch {
                        clients.delete(id);
                    }
                }
            }
        },

        sendToClient(clientId: string, message: BroadcastMessage): void {
            const client = clients.get(clientId);
            if (client) {
                const wsMessage: WebSocketMessage = {
                    type: message.type,
                    data: message.data,
                    timestamp: new Date().toISOString(),
                    clientId: "server",
                };
                try {
                    client.ws.send(JSON.stringify(wsMessage));
                } catch {
                    clients.delete(clientId);
                }
            }
        },

        cleanupStaleConnections(maxAge: number = 60000): number {
            const now = new Date();
            let cleaned = 0;

            for (const [id, client] of clients) {
                const age = now.getTime() - client.lastPing.getTime();
                if (age > maxAge) {
                    clients.delete(id);
                    cleaned++;
                }
            }

            return cleaned;
        },
    };
}

export type ConnectionManager = ReturnType<typeof createConnectionManager>;
