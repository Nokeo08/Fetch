import { describe, test, expect } from "bun:test";
import { normalizeChars, jaroSimilarity, fuzzySearch } from "./fuzzy-search";

describe("Fuzzy Search Utilities", () => {
    describe("normalizeChars", () => {
        test("converts to lowercase", () => {
            expect(normalizeChars("HELLO")).toBe("hello");
        });

        test("removes diacritics", () => {
            expect(normalizeChars("café")).toBe("cafe");
            expect(normalizeChars("naïve")).toBe("naive");
            expect(normalizeChars("résumé")).toBe("resume");
        });

        test("handles empty string", () => {
            expect(normalizeChars("")).toBe("");
        });

        test("preserves numbers and special chars", () => {
            expect(normalizeChars("item-1 (2 lbs)")).toBe("item-1 (2 lbs)");
        });

        test("handles mixed case with diacritics", () => {
            expect(normalizeChars("Über Straße")).toBe("uber straße");
        });
    });

    describe("jaroSimilarity", () => {
        test("returns 1.0 for identical strings", () => {
            expect(jaroSimilarity("milk", "milk")).toBe(1.0);
        });

        test("returns 0.0 for completely different strings", () => {
            expect(jaroSimilarity("abc", "xyz")).toBe(0.0);
        });

        test("returns 0.0 for empty strings against non-empty", () => {
            expect(jaroSimilarity("", "abc")).toBe(0.0);
            expect(jaroSimilarity("abc", "")).toBe(0.0);
        });

        test("returns 1.0 for both empty strings", () => {
            expect(jaroSimilarity("", "")).toBe(1.0);
        });

        test("returns high similarity for similar strings", () => {
            const score = jaroSimilarity("milk", "milke");
            expect(score).toBeGreaterThan(0.8);
        });

        test("returns moderate similarity for somewhat similar strings", () => {
            const score = jaroSimilarity("milk", "malt");
            expect(score).toBeGreaterThan(0.5);
        });

        test("is symmetric", () => {
            const score1 = jaroSimilarity("milk", "silk");
            const score2 = jaroSimilarity("silk", "milk");
            expect(score1).toBe(score2);
        });
    });

    describe("fuzzySearch", () => {
        const items = [
            { name: "Milk" },
            { name: "Almond Milk" },
            { name: "Cheese" },
            { name: "Bread" },
            { name: "Butter" },
            { name: "Banana" },
            { name: "Blueberries" },
        ];

        test("returns empty array for query shorter than 2 chars", () => {
            const result = fuzzySearch("m", items, (i) => i.name);
            expect(result).toEqual([]);
        });

        test("returns empty array for empty query", () => {
            const result = fuzzySearch("", items, (i) => i.name);
            expect(result).toEqual([]);
        });

        test("finds exact substring matches with score 1.0", () => {
            const result = fuzzySearch("milk", items, (i) => i.name);
            const exactMatch = result.find((r) => r.item.name === "Milk");
            expect(exactMatch).toBeDefined();
            expect(exactMatch?.score).toBe(1.0);
        });

        test("finds partial matches", () => {
            const result = fuzzySearch("milk", items, (i) => i.name);
            expect(result.length).toBeGreaterThanOrEqual(2);
            const names = result.map((r) => r.item.name);
            expect(names).toContain("Milk");
            expect(names).toContain("Almond Milk");
        });

        test("results are sorted by score descending", () => {
            const result = fuzzySearch("bread", items, (i) => i.name);
            for (let i = 1; i < result.length; i++) {
                const prev = result[i - 1];
                const curr = result[i];
                if (prev && curr) {
                    expect(prev.score).toBeGreaterThanOrEqual(curr.score);
                }
            }
        });

        test("respects custom threshold", () => {
            const looseResults = fuzzySearch("bre", items, (i) => i.name, 0.3);
            const strictResults = fuzzySearch("bre", items, (i) => i.name, 0.9);

            expect(looseResults.length).toBeGreaterThanOrEqual(strictResults.length);
        });

        test("handles diacritics in search", () => {
            const accented = [{ name: "café" }, { name: "resume" }, { name: "résumé" }];
            const result = fuzzySearch("cafe", accented, (i) => i.name);
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test("case insensitive search", () => {
            const result = fuzzySearch("MILK", items, (i) => i.name);
            expect(result.length).toBeGreaterThanOrEqual(1);
            const names = result.map((r) => r.item.name);
            expect(names).toContain("Milk");
        });
    });
});
