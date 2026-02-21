import { useAuth } from "./AuthContext";
import Lists from "./Lists";
import "./App.css";

function App() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>Fetch</h1>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </header>
            <main className="app-main">
                <Lists />
            </main>
        </div>
    );
}

export default App;
