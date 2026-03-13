import { useState, useEffect, useCallback } from "react";
import type { SupportedLanguage } from "./types";
import { languages, languageMap, DEFAULT_LANGUAGE } from "./index";
import { I18nContext } from "./useTranslation";

const STORAGE_KEY = "fetch-language";

function getNestedValue(obj: Record<string, unknown>, keys: string[]): string | undefined {
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== "object") {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : undefined;
}

function detectBrowserLanguage(): SupportedLanguage {
    const browserLanguages = navigator.languages ?? [navigator.language];

    for (const lang of browserLanguages) {
        const code = lang.toLowerCase().split("-")[0];
        if (code && code in languageMap) {
            return code as SupportedLanguage;
        }
    }

    return DEFAULT_LANGUAGE;
}

function getInitialLanguage(): SupportedLanguage {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored in languageMap) {
            return stored as SupportedLanguage;
        }
    } catch {
        // localStorage unavailable
    }
    return detectBrowserLanguage();
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

    const setLanguage = useCallback((lang: SupportedLanguage) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // localStorage unavailable
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            const keys = key.split(".");

            const currentTranslations = languageMap[language];
            let value = currentTranslations
                ? getNestedValue(currentTranslations as unknown as Record<string, unknown>, keys)
                : undefined;

            if (value === undefined && language !== DEFAULT_LANGUAGE) {
                const fallback = languageMap[DEFAULT_LANGUAGE];
                value = fallback
                    ? getNestedValue(fallback as unknown as Record<string, unknown>, keys)
                    : undefined;
            }

            if (value === undefined) {
                return key;
            }

            if (params) {
                return value.replace(/\{(\w+)\}/g, (match, param: string) => {
                    return params[param] !== undefined ? String(params[param]) : match;
                });
            }

            return value;
        },
        [language]
    );

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, languages }}>
            {children}
        </I18nContext.Provider>
    );
}
