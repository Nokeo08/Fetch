import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "./i18n/index";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
