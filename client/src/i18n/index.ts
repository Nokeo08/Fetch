import type { Translations, SupportedLanguage, LanguageMetadata } from "./types";
import en from "./en";
import pl from "./pl";
import de from "./de";
import es from "./es";
import fr from "./fr";
import pt from "./pt";
import uk from "./uk";
import no from "./no";
import lt from "./lt";
import el from "./el";
import sk from "./sk";
import ru from "./ru";
import sv from "./sv";

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const languageMap: Record<SupportedLanguage, Translations> = {
    en,
    pl,
    de,
    es,
    fr,
    pt,
    uk,
    no,
    lt,
    el,
    sk,
    ru,
    sv,
};

export const languages: LanguageMetadata[] = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "el", name: "Greek", nativeName: "Ελληνικά" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
    { code: "no", name: "Norwegian", nativeName: "Norsk" },
    { code: "pl", name: "Polish", nativeName: "Polski" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
    { code: "ru", name: "Russian", nativeName: "Русский" },
    { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
    { code: "sv", name: "Swedish", nativeName: "Svenska" },
    { code: "uk", name: "Ukrainian", nativeName: "Українська" },
];

export { I18nProvider } from "./I18nContext";
export { useTranslation } from "./useTranslation";
export type { Translations, SupportedLanguage, LanguageMetadata } from "./types";
