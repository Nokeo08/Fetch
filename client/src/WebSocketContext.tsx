import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { WebSocketContext } from "./useWebSocket";
import type { SyncStatus, WebSocketMessage } from "./useWebSocket";

type MessageHandler = (message: WebSocketMessage) => void;

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 25000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SyncStatus>("connecting");
    const [clientId, setClientId] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const handlersRef = useRef<Set<MessageHandler>>(new Set());
    const mountedRef = useRef(false);

    const clearTimers = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    const startHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "ping" }));
            }
        }, HEARTBEAT_INTERVAL);
    }, []);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        const wsUrl = import.meta.env.VITE_WS_URL || (() => {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${window.location.host}/ws`;
        })();

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!mountedRef.current) return;
                setStatus("connected");
                reconnectAttemptsRef.current = 0;
                startHeartbeat();
            };

            ws.onclose = () => {
                if (!mountedRef.current) return;
                setStatus("disconnected");
                clearTimers();
            };

            ws.onerror = () => {
                if (!mountedRef.current) return;
                setStatus("disconnected");
            };

            ws.onmessage = (event) => {
                if (!mountedRef.current) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message.type === "connected") {
                        const data = message.data as { clientId: string };
                        setClientId(data.clientId);
                    }

                    handlersRef.current.forEach((handler) => handler(message));
                } catch (err) {
                    console.error("[WS] Failed to parse message:", err);
                }
            };
        } catch {
            setStatus("disconnected");
        }
    }, [clearTimers, startHeartbeat]);

    const reconnect = useCallback(() => {
        if (!mountedRef.current) return;

        setStatus("reconnecting");
        const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            RECONNECT_MAX_DELAY
        );
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
                connect();
            }
        }, delay);
    }, [connect]);

    const send = useCallback((type: string, data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, data }));
        }
    }, []);

    const subscribe = useCallback((handler: MessageHandler) => {
        handlersRef.current.add(handler);
        return () => {
            handlersRef.current.delete(handler);
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            clearTimers();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect, clearTimers]);

    useEffect(() => {
        if (status === "disconnected" && mountedRef.current) {
            reconnect();
        }
    }, [status, reconnect]);

    return (
        <WebSocketContext.Provider value={{ status, clientId, send, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}
