import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "./i18n/index";
import App from "./App";
import Login from "./Login";
import ListDetail from "./ListDetail";
import Templates from "./Templates";
import TemplateDetail from "./TemplateDetail";
import Settings from "./Settings";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
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
