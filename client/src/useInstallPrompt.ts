import { useState, useEffect, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPromptState = {
    canInstall: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    showPrompt: () => Promise<void>;
    dismissed: boolean;
    dismiss: () => void;
};

const DISMISS_KEY = "fetch-pwa-install-dismissed";

function getIsIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function getIsStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
    );
}

export function useInstallPrompt(): InstallPromptState {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(getIsStandalone);
    const [dismissed, setDismissed] = useState(() => {
        if (typeof localStorage === "undefined") return false;
        return localStorage.getItem(DISMISS_KEY) === "true";
    });

    const isIOS = getIsIOS();

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const installedHandler = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", installedHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
        };
    }, []);

    const showPrompt = useCallback(async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    const dismiss = useCallback(() => {
        setDismissed(true);
        localStorage.setItem(DISMISS_KEY, "true");
    }, []);

    const canInstall = deferredPrompt !== null || (isIOS && !isInstalled);

    return {
        canInstall,
        isInstalled,
        isIOS,
        showPrompt,
        dismissed,
        dismiss,
    };
}
