import { useSyncStatus } from "./useWebSocket";
import { useTranslation } from "./i18n/index";
import "./ConnectionStatus.css";

export default function ConnectionStatus() {
    const status = useSyncStatus();
    const { t } = useTranslation();

    if (status === "connected") {
        return null;
    }

    return (
        <div className={`connection-status ${status}`}>
            {status === "connecting" && t("connection.connecting")}
            {status === "reconnecting" && t("connection.reconnecting")}
            {status === "disconnected" && t("connection.disconnected")}
        </div>
    );
}
