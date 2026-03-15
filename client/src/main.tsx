import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthProvider } from "./AuthContext.tsx";
import { WebSocketProvider } from "./WebSocketContext.tsx";
import { OfflineProvider } from "./OfflineContext.tsx";
import { I18nProvider } from "./i18n/index.ts";
import AppRoutes from "./AppRoutes.tsx";
import InstallBanner from "./InstallBanner.tsx";

const queryClient = new QueryClient();

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    let isReloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!isReloading) {
            isReloading = true;
            window.location.reload();
        }
    });

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            setInterval(() => registration.update(), 5 * 60 * 1000);
        } catch (err) {
            console.error("[SW] Registration failed:", err);
        }
    });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "Root element not found. Check if it's in your index.html or if the id is correct.",
    );
}

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <I18nProvider>
                    <AuthProvider>
                        <OfflineProvider>
                            <WebSocketProvider>
                                <AppRoutes />
                                <InstallBanner />
                            </WebSocketProvider>
                        </OfflineProvider>
                    </AuthProvider>
                </I18nProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>
);
