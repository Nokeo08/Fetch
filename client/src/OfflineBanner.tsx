import { useOffline } from "./OfflineContext";
import "./OfflineBanner.css";

export default function OfflineBanner() {
    const { status, pendingCount, lastSyncTime, syncNow } = useOffline();

    if (status === "online" && pendingCount === 0) {
        return null;
    }

    return (
        <div className={`offline-banner ${status}`}>
            {status === "offline" && (
                <span>You are offline. Changes will sync when connection is restored.</span>
            )}
            {status === "syncing" && (
                <span>Syncing {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}...</span>
            )}
            {status === "online" && pendingCount > 0 && (
                <span>
                    {pendingCount} pending change{pendingCount !== 1 ? "s" : ""} waiting to sync
                </span>
            )}
            {(status === "online" || status === "syncing") && pendingCount > 0 && (
                <button className="sync-button" onClick={syncNow} disabled={status === "syncing"}>
                    {status === "syncing" ? "Syncing..." : "Sync Now"}
                </button>
            )}
            {status === "offline" && lastSyncTime && (
                <span className="last-sync">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}
