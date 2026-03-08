import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTranslation } from "./i18n/index";
import Lists from "./Lists";
import ConnectionStatus from "./ConnectionStatus";
import OfflineBanner from "./OfflineBanner";
import "./App.css";

function App() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="app">
            <ConnectionStatus />
            <OfflineBanner />
            <header className="app-header">
                <h1>{t("app.name")}</h1>
                <div className="header-nav">
                    <button className="nav-btn" onClick={() => navigate("/templates")}>
                        {t("nav.templates")}
                    </button>
                    <button className="nav-btn" onClick={() => navigate("/settings")}>
                        {t("nav.settings")}
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        {t("auth.logout")}
                    </button>
                </div>
            </header>
            <main className="app-main">
                <Lists />
            </main>
        </div>
    );
}

export default App;
