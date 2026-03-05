import { describe, test, expect, beforeEach } from "bun:test";
import { createConnectionManager, type WebSocketData } from "./connection-manager";
import type { ServerWebSocket } from "bun";

type MockWebSocket = {
    send: (data: string) => void;
    close: () => void;
    data: WebSocketData;
    readyState: number;
    sentMessages: string[];
    closed: boolean;
};

function createMockWebSocket(): { ws: ServerWebSocket<WebSocketData>; mock: MockWebSocket } {
    const mock: MockWebSocket = {
        sentMessages: [],
        closed: false,
        send: function (data: string) {
            this.sentMessages.push(data);
        },
        close: function () {
            this.closed = true;
        },
        data: null,
        readyState: 1,
    };

    const ws = mock as unknown as ServerWebSocket<WebSocketData>;
    return { ws, mock };
}

describe("ConnectionManager", () => {
    let manager: ReturnType<typeof createConnectionManager>;

    beforeEach(() => {
        manager = createConnectionManager();
    });

    describe("addClient", () => {
        test("should add a client to the manager", () => {
            const { ws } = createMockWebSocket();
            manager.addClient("client-1", ws);

            expect(manager.getClientCount()).toBe(1);
            expect(manager.getClient("client-1")).toBeDefined();
        });

        test("should store client with correct metadata", () => {
            const { ws } = createMockWebSocket();
            const beforeAdd = new Date();
            manager.addClient("client-1", ws);
            const afterAdd = new Date();

            const client = manager.getClient("client-1");
            expect(client).toBeDefined();
            expect(client!.id).toBe("client-1");
            expect(client!.ws).toBe(ws);
            expect(client!.connectedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
            expect(client!.connectedAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
        });

        test("should track multiple clients", () => {
            const { ws: ws1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();
            const { ws: ws3 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);
            manager.addClient("client-3", ws3);

            expect(manager.getClientCount()).toBe(3);
            expect(manager.getConnectedClientIds()).toEqual(["client-1", "client-2", "client-3"]);
        });
    });

    describe("removeClient", () => {
        test("should remove a client from the manager", () => {
            const { ws } = createMockWebSocket();
            manager.addClient("client-1", ws);
            expect(manager.getClientCount()).toBe(1);

            manager.removeClient("client-1");
            expect(manager.getClientCount()).toBe(0);
            expect(manager.getClient("client-1")).toBeUndefined();
        });

        test("should not error when removing non-existent client", () => {
            expect(() => manager.removeClient("non-existent")).not.toThrow();
        });
    });

    describe("getClient", () => {
        test("should return client if exists", () => {
            const { ws } = createMockWebSocket();
            manager.addClient("client-1", ws);

            const client = manager.getClient("client-1");
            expect(client).toBeDefined();
            expect(client!.id).toBe("client-1");
        });

        test("should return undefined if client does not exist", () => {
            const client = manager.getClient("non-existent");
            expect(client).toBeUndefined();
        });
    });

    describe("updatePing", () => {
        test("should update lastPing timestamp", async () => {
            const { ws } = createMockWebSocket();
            manager.addClient("client-1", ws);
            const originalPing = manager.getClient("client-1")!.lastPing;

            await new Promise((resolve) => setTimeout(resolve, 10));
            manager.updatePing("client-1");

            const updatedPing = manager.getClient("client-1")!.lastPing;
            expect(updatedPing.getTime()).toBeGreaterThan(originalPing.getTime());
        });

        test("should not error when updating non-existent client", () => {
            expect(() => manager.updatePing("non-existent")).not.toThrow();
        });
    });

    describe("getConnectedClientIds", () => {
        test("should return empty array when no clients", () => {
            expect(manager.getConnectedClientIds()).toEqual([]);
        });

        test("should return all client IDs", () => {
            const { ws: ws1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();
            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);

            expect(manager.getConnectedClientIds()).toEqual(["client-1", "client-2"]);
        });
    });

    describe("getClientCount", () => {
        test("should return 0 when no clients", () => {
            expect(manager.getClientCount()).toBe(0);
        });

        test("should return correct count", () => {
            const { ws: ws1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();
            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);

            expect(manager.getClientCount()).toBe(2);
        });
    });

    describe("broadcast", () => {
        test("should send message to all connected clients", () => {
            const { ws: ws1, mock: mock1 } = createMockWebSocket();
            const { ws: ws2, mock: mock2 } = createMockWebSocket();
            const { ws: ws3, mock: mock3 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);
            manager.addClient("client-3", ws3);

            manager.broadcast({ type: "item_created", data: { name: "Test" } });

            expect(mock1.sentMessages.length).toBe(1);
            expect(mock2.sentMessages.length).toBe(1);
            expect(mock3.sentMessages.length).toBe(1);

            const message1 = JSON.parse(mock1.sentMessages[0]!);
            expect(message1.type).toBe("item_created");
            expect(message1.data).toEqual({ name: "Test" });
            expect(message1.timestamp).toBeDefined();
        });

        test("should exclude specified client from broadcast", () => {
            const { ws: ws1, mock: mock1 } = createMockWebSocket();
            const { ws: ws2, mock: mock2 } = createMockWebSocket();
            const { ws: ws3, mock: mock3 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);
            manager.addClient("client-3", ws3);

            manager.broadcast({ type: "item_created", data: { name: "Test" } }, "client-2");

            expect(mock1.sentMessages.length).toBe(1);
            expect(mock2.sentMessages.length).toBe(0);
            expect(mock3.sentMessages.length).toBe(1);
        });

        test("should remove client if send fails", () => {
            const { ws: ws1, mock: mock1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();

            mock1.send = () => {
                throw new Error("Send failed");
            };

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);

            manager.broadcast({ type: "item_created", data: {} });

            expect(manager.getClientCount()).toBe(1);
            expect(manager.getClient("client-1")).toBeUndefined();
            expect(manager.getClient("client-2")).toBeDefined();
        });

        test("should include timestamp in message", () => {
            const { ws, mock } = createMockWebSocket();
            manager.addClient("client-1", ws);

            const before = new Date();
            manager.broadcast({ type: "item_created", data: {} });
            const after = new Date();

            const message = JSON.parse(mock.sentMessages[0]!);
            const timestamp = new Date(message.timestamp);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe("sendToClient", () => {
        test("should send message to specific client", () => {
            const { ws: ws1, mock: mock1 } = createMockWebSocket();
            const { ws: ws2, mock: mock2 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);

            manager.sendToClient("client-1", { type: "item_updated", data: { id: 1 } });

            expect(mock1.sentMessages.length).toBe(1);
            expect(mock2.sentMessages.length).toBe(0);
        });

        test("should not error when client does not exist", () => {
            expect(() => manager.sendToClient("non-existent", { type: "test", data: {} })).not.toThrow();
        });

        test("should remove client if send fails", () => {
            const { ws, mock } = createMockWebSocket();
            mock.send = () => {
                throw new Error("Send failed");
            };

            manager.addClient("client-1", ws);
            expect(manager.getClientCount()).toBe(1);

            manager.sendToClient("client-1", { type: "test", data: {} });

            expect(manager.getClientCount()).toBe(0);
        });
    });

    describe("cleanupStaleConnections", () => {
        test("should remove clients with old lastPing", async () => {
            const { ws: ws1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);

            const client1 = manager.getClient("client-1")!;
            client1.lastPing = new Date(Date.now() - 120000);

            const cleaned = manager.cleanupStaleConnections(60000);

            expect(cleaned).toBe(1);
            expect(manager.getClientCount()).toBe(1);
            expect(manager.getClient("client-1")).toBeUndefined();
            expect(manager.getClient("client-2")).toBeDefined();
        });

        test("should return 0 when no stale connections", () => {
            const { ws } = createMockWebSocket();
            manager.addClient("client-1", ws);
            manager.updatePing("client-1");

            const cleaned = manager.cleanupStaleConnections(60000);
            expect(cleaned).toBe(0);
            expect(manager.getClientCount()).toBe(1);
        });

        test("should clean up multiple stale connections", async () => {
            const { ws: ws1 } = createMockWebSocket();
            const { ws: ws2 } = createMockWebSocket();
            const { ws: ws3 } = createMockWebSocket();

            manager.addClient("client-1", ws1);
            manager.addClient("client-2", ws2);
            manager.addClient("client-3", ws3);

            manager.getClient("client-1")!.lastPing = new Date(Date.now() - 120000);
            manager.getClient("client-2")!.lastPing = new Date(Date.now() - 90000);

            const cleaned = manager.cleanupStaleConnections(60000);

            expect(cleaned).toBe(2);
            expect(manager.getClientCount()).toBe(1);
            expect(manager.getClient("client-3")).toBeDefined();
        });
    });
});
