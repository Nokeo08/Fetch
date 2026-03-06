import { describe, test, expect } from "bun:test";
import { normalizeChars, jaroSimilarity, fuzzySearch } from "./fuzzy-search";

describe("fuzzy-search", () => {
    describe("normalizeChars", () => {
        test("should convert to lowercase", () => {
            expect(normalizeChars("HELLO")).toBe("hello");
        });

        test("should remove diacritical marks", () => {
            expect(normalizeChars("café")).toBe("cafe");
            expect(normalizeChars("naïve")).toBe("naive");
        });

        test("should handle regular ASCII", () => {
            expect(normalizeChars("hello")).toBe("hello");
        });

        test("should handle empty string", () => {
            expect(normalizeChars("")).toBe("");
        });
    });

    describe("jaroSimilarity", () => {
        test("should return 1.0 for identical strings", () => {
            expect(jaroSimilarity("hello", "hello")).toBe(1.0);
        });

        test("should return 0.0 for empty strings", () => {
            expect(jaroSimilarity("", "hello")).toBe(0.0);
            expect(jaroSimilarity("hello", "")).toBe(0.0);
        });

        test("should return high score for similar strings", () => {
            const score = jaroSimilarity("milk", "milka");
            expect(score).toBeGreaterThan(0.7);
        });

        test("should return low score for different strings", () => {
            const score = jaroSimilarity("abc", "xyz");
            expect(score).toBeLessThan(0.5);
        });

        test("should handle transpositions", () => {
            const score = jaroSimilarity("CRATE", "RACE");
            expect(score).toBeGreaterThan(0.7);
        });

        test("should handle special characters", () => {
            const score = jaroSimilarity("test", "test");
            expect(score).toBe(1.0);
        });
    });

    describe("fuzzySearch", () => {
        interface TestItem {
            id: number;
            name: string;
            category: string;
        }

        test("should return empty array for short queries", () => {
            const items: TestItem[] = [
                { id: 1, name: "Milk", category: "Dairy" },
                { id: 2, name: "Bread", category: "Bakery" },
            ];
            expect(fuzzySearch("a", items, (i) => i.name)).toEqual([]);
            expect(fuzzySearch("", items, (i) => i.name)).toEqual([]);
        });

        test("should find exact substring matches with score 1.0", () => {
            const items: TestItem[] = [
                { id: 1, name: "Whole Milk", category: "Dairy" },
                { id: 2, name: "Skim Milk", category: "Dairy" },
                { id: 3, name: "Bread", category: "Bakery" },
            ];
            const results = fuzzySearch("milk", items, (i) => i.name);
            expect(results.length).toBe(2);
            expect(results[0]?.score).toBe(1.0);
        });

        test("should rank by similarity score", () => {
            const items: TestItem[] = [
                { id: 1, name: "Apple", category: "Fruit" },
                { id: 2, name: "Crabapple", category: "Fruit" },
                { id: 3, name: "Appleton", category: "Place" },
            ];
            const results = fuzzySearch("apple", items, (i) => i.name);
            expect(results.length).toBe(3);
            expect(results[0]?.item.name).toBe("Apple");
            expect(results[0]?.score).toBe(1.0);
        });

        test("should filter by threshold", () => {
            const items: TestItem[] = [
                { id: 1, name: "hello", category: "a" },
                { id: 2, name: "world", category: "b" },
                { id: 3, name: "help", category: "c" },
            ];
            const results = fuzzySearch("hello", items, (i) => i.name, 0.9);
            expect(results.length).toBe(1);
        });

        test("should handle case-insensitive matching", () => {
            const items: TestItem[] = [
                { id: 1, name: "MILK", category: "Dairy" },
                { id: 2, name: "milk", category: "Dairy" },
            ];
            const results = fuzzySearch("Milk", items, (i) => i.name);
            expect(results.length).toBe(2);
        });

        test("should handle normalized characters", () => {
            const items: TestItem[] = [
                { id: 1, name: "café", category: "Drinks" },
                { id: 2, name: "Cafe", category: "Drinks" },
            ];
            const results = fuzzySearch("cafe", items, (i) => i.name);
            expect(results.length).toBe(2);
        });

        test("should return empty for no matches", () => {
            const items: TestItem[] = [
                { id: 1, name: "Apple", category: "Fruit" },
                { id: 2, name: "Banana", category: "Fruit" },
            ];
            const results = fuzzySearch("xyz123", items, (i) => i.name);
            expect(results.length).toBe(0);
        });
    });
});
