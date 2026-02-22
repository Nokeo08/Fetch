import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Lists from "./Lists";
import "./App.css";

function App() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>Fetch</h1>
                <div className="header-nav">
                    <button className="nav-btn" onClick={() => navigate("/templates")}>
                        Templates
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
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
