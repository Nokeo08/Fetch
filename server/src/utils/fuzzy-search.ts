export function normalizeChars(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function containsInOrder(text: string, query: string): boolean {
    let queryIdx = 0;
    for (let i = 0; i < text.length && queryIdx < query.length; i++) {
        if (text[i] === query[queryIdx]) {
            queryIdx++;
        }
    }
    return queryIdx === query.length;
}

export function jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;

    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    return (
        (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
    );
}

export interface ScoredEntry<T> {
    item: T;
    score: number;
}

export function fuzzySearch<T>(
    query: string,
    items: T[],
    getSearchableText: (item: T) => string,
    threshold: number = 0.5
): ScoredEntry<T>[] {
    if (!query || query.length < 2) return [];

    const normalizedQuery = normalizeChars(query);
    const results: ScoredEntry<T>[] = [];

    for (const item of items) {
        const searchableText = getSearchableText(item);
        const normalizedText = normalizeChars(searchableText);

        if (normalizedText.includes(normalizedQuery)) {
            results.push({ item, score: 1.0 });
            continue;
        }

        if (!containsInOrder(normalizedText, normalizedQuery)) {
            continue;
        }

        const score = jaroSimilarity(normalizedQuery, normalizedText);
        if (score >= threshold) {
            results.push({ item, score });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}
