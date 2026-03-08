import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import Login from "./Login.tsx";
import ListDetail from "./ListDetail.tsx";
import Templates from "./Templates.tsx";
import TemplateDetail from "./TemplateDetail.tsx";
import Settings from "./Settings.tsx";
import { AuthProvider, useAuth } from "./AuthContext.tsx";
import { WebSocketProvider } from "./WebSocketContext.tsx";
import { OfflineProvider } from "./OfflineContext.tsx";
import { I18nProvider, useTranslation } from "./i18n/index.ts";

const queryClient = new QueryClient();

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
            console.error("[SW] Registration failed:", err);
        });
    });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "Root element not found. Check if it's in your index.html or if the id is correct.",
    );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();

    if (isLoading) {
        return <div className="loading">{t("common.loading")}</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function AppRoutes() {
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();

    if (isLoading) {
        return <div className="loading">{t("common.loading")}</div>;
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    isAuthenticated ? <Navigate to="/" replace /> : <Login />
                }
            />
            <Route
                path="/lists/:id"
                element={
                    <ProtectedRoute>
                        <ListDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/templates"
                element={
                    <ProtectedRoute>
                        <Templates />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/templates/:id"
                element={
                    <ProtectedRoute>
                        <TemplateDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <App />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function Main() {
    return (
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <I18nProvider>
                        <AuthProvider>
                            <OfflineProvider>
                                <WebSocketProvider>
                                    <AppRoutes />
                                </WebSocketProvider>
                            </OfflineProvider>
                        </AuthProvider>
                    </I18nProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </StrictMode>
    );
}

createRoot(rootElement).render(<Main />);
