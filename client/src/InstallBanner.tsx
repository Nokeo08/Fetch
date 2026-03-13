import { useInstallPrompt } from "./useInstallPrompt";
import { useTranslation } from "./i18n/index.ts";
import "./InstallBanner.css";

export default function InstallBanner() {
    const { canInstall, isInstalled, isIOS, showPrompt, dismissed, dismiss } = useInstallPrompt();
    const { t } = useTranslation();

    if (isInstalled || dismissed || !canInstall) {
        return null;
    }

    return (
        <div className="install-banner">
            <div className="install-banner-content">
                <div className="install-banner-text">
                    <strong>{t("pwa.installTitle")}</strong>
                    <span>{isIOS ? t("pwa.iosInstructions") : t("pwa.installDescription")}</span>
                </div>
                <div className="install-banner-actions">
                    {!isIOS && (
                        <button className="install-banner-btn install-btn" onClick={showPrompt}>
                            {t("pwa.installButton")}
                        </button>
                    )}
                    <button className="install-banner-btn dismiss-btn" onClick={dismiss}>
                        {t("pwa.dismissButton")}
                    </button>
                </div>
            </div>
        </div>
    );
}
