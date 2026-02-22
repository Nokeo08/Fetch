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
import { AuthProvider, useAuth } from "./AuthContext.tsx";
import { WebSocketProvider } from "./WebSocketContext.tsx";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "Root element not found. Check if it's in your index.html or if the id is correct.",
    );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function AppRoutes() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading">Loading...</div>;
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
                    <AuthProvider>
                        <WebSocketProvider>
                            <AppRoutes />
                        </WebSocketProvider>
                    </AuthProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </StrictMode>
    );
}

createRoot(rootElement).render(<Main />);
