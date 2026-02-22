import { serve } from "bun";
import app, { db, closeDatabase } from "./index";
import { wsApp, websocket } from "./websocket";
import { getConfig } from "./config";

const config = getConfig();
const port = config.port;

let server: ReturnType<typeof serve> | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) {
        console.log(`[Shutdown] Already shutting down, ignoring ${signal}`);
        return;
    }

    isShuttingDown = true;
    console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
        console.log("[Shutdown] Force exiting after timeout");
        process.exit(1);
    }, 10000);

    try {
        if (server) {
            console.log("[Shutdown] Stopping server...");
            server.stop(true);
            console.log("[Shutdown] Server stopped");
        }

        console.log("[Shutdown] Closing database connections...");
        closeDatabase(db);
        console.log("[Shutdown] Database closed");

        clearTimeout(shutdownTimeout);
        console.log("[Shutdown] Graceful shutdown complete");
        process.exit(0);
    } catch (err) {
        console.error("[Shutdown] Error during shutdown:", err);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    console.error("[Error] Uncaught exception:", err);
    gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("[Error] Unhandled rejection at:", promise, "reason:", reason);
});

console.log(`[Server] Starting Fetch server on port ${port}...`);

server = serve({
    port,
    fetch: app.fetch,
    websocket,
    idleTimeout: 255,
});

console.log(`[Server] Fetch server running at http://localhost:${port}`);
console.log(`[Server] Health check available at http://localhost:${port}/health`);
console.log(`[Server] WebSocket available at ws://localhost:${port}/ws`);
