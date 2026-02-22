import { useSyncStatus } from "./WebSocketContext";
import "./ConnectionStatus.css";

export default function ConnectionStatus() {
    const status = useSyncStatus();

    if (status === "connected") {
        return null;
    }

    return (
        <div className={`connection-status ${status}`}>
            {status === "connecting" && "Connecting..."}
            {status === "reconnecting" && "Reconnecting..."}
            {status === "disconnected" && "Disconnected"}
        </div>
    );
}
