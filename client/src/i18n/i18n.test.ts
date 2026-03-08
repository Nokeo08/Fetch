import { describe, it, expect } from "bun:test";
import type { Translations, SupportedLanguage } from "./types";
import { languageMap, languages, DEFAULT_LANGUAGE } from "./index";
import en from "./en";

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

function t(
    translations: Translations,
    key: string,
    params?: Record<string, string | number>,
): string {
    const keys = key.split(".");
    let value = getNestedValue(translations as unknown as Record<string, unknown>, keys);

    if (value === undefined) {
        value = getNestedValue(en as unknown as Record<string, unknown>, keys);
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
}

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

describe("i18n system", () => {
    describe("translation function", () => {
        it("returns value for simple key", () => {
            expect(t(en, "common.cancel")).toBe("Cancel");
        });

        it("returns value for nested key", () => {
            expect(t(en, "auth.password")).toBe("Password");
        });

        it("returns key name when key is missing", () => {
            expect(t(en, "nonexistent.key")).toBe("nonexistent.key");
        });

        it("performs parameter substitution", () => {
            expect(t(en, "common.items", { count: 5 })).toBe("5 items");
        });

        it("performs multiple parameter substitution", () => {
            expect(t(en, "applyTemplate.addedWithSkipped", { added: 3, skipped: 2 })).toBe(
                "Added 3 items, skipped 2 duplicates",
            );
        });

        it("leaves unmatched parameters as-is", () => {
            expect(t(en, "common.items", {})).toBe("{count} items");
        });

        it("handles string parameters", () => {
            expect(t(en, "lists.deleteConfirm", { name: "Groceries" })).toBe(
                "Are you sure you want to delete \"Groceries\"?",
            );
        });
    });

    describe("fallback to English", () => {
        it("falls back to English when key missing from target language", () => {
            const partial = { common: { cancel: "Annuler" } } as unknown as Translations;
            expect(t(partial, "auth.password")).toBe("Password");
        });

        it("returns key name if missing from both target and English", () => {
            const partial = {} as unknown as Translations;
            expect(t(partial, "totally.missing.key")).toBe("totally.missing.key");
        });
    });

    describe("language metadata", () => {
        it("has 13 supported languages", () => {
            expect(languages.length).toBe(13);
        });

        it("has English as default language", () => {
            expect(DEFAULT_LANGUAGE).toBe("en");
        });

        it("has all language codes in languageMap", () => {
            for (const lang of languages) {
                expect(languageMap[lang.code]).toBeDefined();
            }
        });

        it("has unique language codes", () => {
            const codes = languages.map((l) => l.code);
            expect(new Set(codes).size).toBe(codes.length);
        });

        it("every language has a native name", () => {
            for (const lang of languages) {
                expect(lang.nativeName.length).toBeGreaterThan(0);
            }
        });
    });

    describe("translation completeness", () => {
        const enKeys = getAllKeys(en as unknown as Record<string, unknown>);

        it("English has all expected top-level namespaces", () => {
            const namespaces = Object.keys(en);
            expect(namespaces).toContain("common");
            expect(namespaces).toContain("app");
            expect(namespaces).toContain("auth");
            expect(namespaces).toContain("nav");
            expect(namespaces).toContain("lists");
            expect(namespaces).toContain("listDetail");
            expect(namespaces).toContain("sections");
            expect(namespaces).toContain("items");
            expect(namespaces).toContain("clearCompleted");
            expect(namespaces).toContain("applyTemplate");
            expect(namespaces).toContain("saveAsTemplate");
            expect(namespaces).toContain("templates");
            expect(namespaces).toContain("templateDetail");
            expect(namespaces).toContain("settings");
            expect(namespaces).toContain("exportModal");
            expect(namespaces).toContain("importModal");
            expect(namespaces).toContain("connection");
            expect(namespaces).toContain("offline");
        });

        const supportedLanguages: SupportedLanguage[] = [
            "pl", "de", "es", "fr", "pt", "uk", "no", "lt", "el", "sk", "ru", "sv",
        ];

        for (const lang of supportedLanguages) {
            it(`${lang} has all keys from English`, () => {
                const translations = languageMap[lang];
                const langKeys = getAllKeys(translations as unknown as Record<string, unknown>);
                const missingKeys = enKeys.filter((key) => !langKeys.includes(key));
                expect(missingKeys).toEqual([]);
            });
        }

        it("all translation values are non-empty strings", () => {
            for (const [_lang, translations] of Object.entries(languageMap)) {
                const keys = getAllKeys(translations as unknown as Record<string, unknown>);
                for (const key of keys) {
                    const value = getNestedValue(translations as unknown as Record<string, unknown>, key.split("."));
                    expect(typeof value).toBe("string");
                    if (typeof value === "string") {
                        expect(value.length).toBeGreaterThan(0);
                    }
                }
            }
        });
    });

    describe("parameter placeholders preserved", () => {
        const keysWithParams = [
            "common.items",
            "common.itemSingular",
            "common.sections",
            "common.sectionSingular",
            "common.enterName",
            "lists.deleteConfirm",
            "lists.deleteWarning",
            "listDetail.completed",
            "sections.deleteConfirm",
            "sections.deleteWarning",
            "items.deleteConfirm",
            "clearCompleted.message",
            "clearCompleted.cleared",
            "applyTemplate.addItems",
            "applyTemplate.addedItems",
            "applyTemplate.addedWithSkipped",
            "saveAsTemplate.description",
            "saveAsTemplate.createdSuccess",
            "templates.deleteConfirm",
            "templates.moreItems",
            "templateDetail.deleteConfirm",
            "offline.syncing",
            "offline.syncingSingular",
            "offline.pendingChanges",
            "offline.pendingChangeSingular",
        ];

        for (const key of keysWithParams) {
            it(`${key} has {param} placeholders in all languages`, () => {
                const enValue = getNestedValue(en as unknown as Record<string, unknown>, key.split("."));
                expect(enValue).toBeDefined();
                if (!enValue) return;

                const enParams = enValue.match(/\{(\w+)\}/g) ?? [];
                expect(enParams.length).toBeGreaterThan(0);

                for (const [_lang, translations] of Object.entries(languageMap)) {
                    const value = getNestedValue(translations as unknown as Record<string, unknown>, key.split("."));
                    if (value === undefined) continue;

                    for (const param of enParams) {
                        expect(value).toContain(param);
                    }
                }
            });
        }
    });
});
