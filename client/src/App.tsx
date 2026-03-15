import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "./i18n/index";
import Lists from "./Lists";
import ConnectionStatus from "./ConnectionStatus";
import OfflineBanner from "./OfflineBanner";
import "./App.css";

function App() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
    };

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="app">
            <ConnectionStatus />
            <OfflineBanner />
            <header className="app-header" ref={menuRef}>
                <img src="/banner.png" alt={t("app.name")} className="app-banner" />
                <button
                    className="hamburger-btn"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label={menuOpen ? "Close menu" : "Menu"}
                >
                    {menuOpen ? "✕" : "☰"}
                </button>
                <div className={`header-nav ${menuOpen ? "open" : ""}`}>
                    <button className="nav-btn" onClick={() => { setMenuOpen(false); navigate("/templates"); }}>
                        {t("nav.templates")}
                    </button>
                    <button className="nav-btn" onClick={() => { setMenuOpen(false); navigate("/settings"); }}>
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
