import { useOffline } from "./useOffline";
import { useTranslation } from "./i18n/index";
import "./OfflineBanner.css";

export default function OfflineBanner() {
    const { status, pendingCount, lastSyncTime, syncNow } = useOffline();
    const { t } = useTranslation();

    if (status === "online" && pendingCount === 0) {
        return null;
    }

    return (
        <div className={`offline-banner ${status}`}>
            {status === "offline" && (
                <span>{t("offline.offlineMessage")}</span>
            )}
            {status === "syncing" && (
                <span>{pendingCount !== 1 ? t("offline.syncing", { count: pendingCount }) : t("offline.syncingSingular", { count: pendingCount })}</span>
            )}
            {status === "online" && pendingCount > 0 && (
                <span>
                    {pendingCount !== 1 ? t("offline.pendingChanges", { count: pendingCount }) : t("offline.pendingChangeSingular", { count: pendingCount })}
                </span>
            )}
            {(status === "online" || status === "syncing") && pendingCount > 0 && (
                <button className="sync-button" onClick={syncNow} disabled={status === "syncing"}>
                    {status === "syncing" ? t("offline.syncingBtn") : t("offline.syncNow")}
                </button>
            )}
            {status === "offline" && lastSyncTime && (
                <span className="last-sync">
                    {t("offline.lastSynced")} {lastSyncTime.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}
