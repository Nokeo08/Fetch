import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { createConnectionManager, type WebSocketData, type BroadcastMessage } from "./connection-manager";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket<WebSocketData>>();

const connectionManager = createConnectionManager();

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 60000;

function generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

setInterval(() => {
    const cleaned = connectionManager.cleanupStaleConnections(HEARTBEAT_TIMEOUT);
    if (cleaned > 0) {
        console.log(`[WS] Cleaned up ${cleaned} stale connections`);
    }
}, HEARTBEAT_INTERVAL);

function parseMessage(data: string): { type: string; data: unknown } | null {
    try {
        const parsed = JSON.parse(data);
        if (typeof parsed.type === "string") {
            return parsed;
        }
    } catch {
    }
    return null;
}

const wsApp = new Hono();

wsApp.get(
    "/ws",
    upgradeWebSocket((c) => {
        const clientId = generateClientId();

        return {
            onOpen(_event, ws) {
                console.log(`[WS] Client connected: ${clientId}`);
                connectionManager.addClient(clientId, ws.raw as ServerWebSocket<WebSocketData>);

                ws.send(
                    JSON.stringify({
                        type: "connected",
                        data: { clientId },
                        timestamp: new Date().toISOString(),
                        clientId: "server",
                    })
                );
            },

            onMessage(event, ws) {
                const message = parseMessage(event.data as string);

                if (!message) {
                    return;
                }

                switch (message.type) {
                    case "ping":
                        connectionManager.updatePing(clientId);
                        ws.send(
                            JSON.stringify({
                                type: "pong",
                                data: { timestamp: new Date().toISOString() },
                                timestamp: new Date().toISOString(),
                                clientId: "server",
                            })
                        );
                        break;

                    case "pong":
                        connectionManager.updatePing(clientId);
                        break;

                    case "ack":
                        break;

                    default:
                        console.log(`[WS] Unknown message type: ${message.type}`);
                }
            },

            onClose() {
                console.log(`[WS] Client disconnected: ${clientId}`);
                connectionManager.removeClient(clientId);
            },

            onError(error) {
                console.error(`[WS] Error for client ${clientId}:`, error);
                connectionManager.removeClient(clientId);
            },
        };
    })
);

export function broadcastUpdate(message: BroadcastMessage, excludeClientId?: string): void {
    connectionManager.broadcast(message, excludeClientId);
}

export { wsApp, websocket, connectionManager };
