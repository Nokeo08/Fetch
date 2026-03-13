import { createContext, useContext } from "react";
import type { SupportedLanguage, LanguageMetadata } from "./types";

export type I18nContextType = {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    languages: LanguageMetadata[];
};

export const I18nContext = createContext<I18nContextType | null>(null);

export function useTranslation(): I18nContextType {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
