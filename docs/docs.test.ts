import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";

const ROOT = resolve(import.meta.dir, "..");

function getMarkdownFiles(dir: string): string[] {
    const { globSync } = require("fs");
    const glob = new Bun.Glob("**/*.md");
    const results: string[] = [];
    for (const path of glob.scanSync({ cwd: dir, absolute: false })) {
        if (!path.includes("node_modules") && !path.includes(".git") && !path.includes("stories/")) {
            results.push(path);
        }
    }
    return results;
}

function stripCodeBlocks(content: string): string {
    return content.replace(/```[\s\S]*?```/g, "");
}

function extractLocalLinks(content: string): string[] {
    const stripped = stripCodeBlocks(content);
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(stripped)) !== null) {
        const href = match[2]!;
        if (
            !href.startsWith("http://") &&
            !href.startsWith("https://") &&
            !href.startsWith("#") &&
            !href.startsWith("mailto:")
        ) {
            const cleanHref = href.split("#")[0]!;
            if (cleanHref.length > 0) {
                links.push(cleanHref);
            }
        }
    }
    return links;
}

describe("Documentation", () => {
    test("all expected documentation files exist", () => {
        const expectedFiles = [
            "README.md",
            "CONTRIBUTING.md",
            "CHANGELOG.md",
            "LICENSE",
            "docs/getting-started.md",
            "docs/troubleshooting.md",
            "docs/user-guide/managing-lists.md",
            "docs/user-guide/items.md",
            "docs/user-guide/templates.md",
            "docs/user-guide/offline-mode.md",
            "docs/developer-guide/architecture.md",
            "docs/developer-guide/development-setup.md",
            "docs/deployment/docker.md",
            "docs/deployment/reverse-proxy.md",
            "docs/deployment/ssl-tls.md",
            "docs/deployment/backup-restore.md",
            "docs/api/README.md",
            "docs/api/authentication.md",
            "docs/api/openapi.yaml",
            "client/README.md",
            "server/README.md",
            "shared/README.md",
        ];

        const missing: string[] = [];
        for (const file of expectedFiles) {
            const fullPath = resolve(ROOT, file);
            if (!existsSync(fullPath)) {
                missing.push(file);
            }
        }

        expect(missing).toEqual([]);
    });

    test("all local markdown links point to existing files", () => {
        const mdFiles = getMarkdownFiles(ROOT);
        const brokenLinks: { file: string; link: string }[] = [];

        for (const relPath of mdFiles) {
            const fullPath = resolve(ROOT, relPath);
            const content = readFileSync(fullPath, "utf-8");
            const links = extractLocalLinks(content);
            const fileDir = dirname(fullPath);

            for (const link of links) {
                if (link.startsWith("<") || link.includes("${") || link.includes("your-")) {
                    continue;
                }
                const targetPath = resolve(fileDir, link);
                if (!existsSync(targetPath)) {
                    brokenLinks.push({ file: relPath, link });
                }
            }
        }

        if (brokenLinks.length > 0) {
            const details = brokenLinks
                .map((b) => `  ${b.file} -> ${b.link}`)
                .join("\n");
            expect(brokenLinks).toEqual(
                [],
            );
        }
    });

    test("README.md contains required sections", () => {
        const content = readFileSync(resolve(ROOT, "README.md"), "utf-8");

        const requiredSections = [
            "Features",
            "Quick Start",
            "Configuration",
            "Documentation",
            "Project Structure",
            "Contributing",
            "License",
        ];

        const missing: string[] = [];
        for (const section of requiredSections) {
            if (!content.includes(`## ${section}`)) {
                missing.push(section);
            }
        }

        expect(missing).toEqual([]);
    });

    test("README.md references GPL-3.0 license", () => {
        const content = readFileSync(resolve(ROOT, "README.md"), "utf-8");
        expect(content).toContain("GPL");
    });

    test("CONTRIBUTING.md contains required sections", () => {
        const content = readFileSync(
            resolve(ROOT, "CONTRIBUTING.md"),
            "utf-8",
        );

        const requiredSections = [
            "How to Contribute",
            "Code of Conduct",
            "Pull Request Process",
            "Code Style",
        ];

        const missing: string[] = [];
        for (const section of requiredSections) {
            if (!content.includes(section)) {
                missing.push(section);
            }
        }

        expect(missing).toEqual([]);
    });

    test("CHANGELOG.md follows Keep a Changelog format", () => {
        const content = readFileSync(
            resolve(ROOT, "CHANGELOG.md"),
            "utf-8",
        );

        expect(content).toContain("# Changelog");
        expect(content).toContain("Keep a Changelog");
        expect(content).toContain("Semantic Versioning");
        expect(content).toContain("### Added");
    });

    test("OpenAPI spec contains all major endpoint groups", () => {
        const content = readFileSync(
            resolve(ROOT, "docs/api/openapi.yaml"),
            "utf-8",
        );

        const requiredPaths = [
            "/health",
            "/api/login",
            "/api/v1/lists",
            "/api/v1/sections",
            "/api/v1/items",
            "/api/v1/templates",
            "/api/v1/history",
            "/api/v1/export",
            "/api/v1/import",
        ];

        const missing: string[] = [];
        for (const path of requiredPaths) {
            if (!content.includes(path)) {
                missing.push(path);
            }
        }

        expect(missing).toEqual([]);
    });

    test("OpenAPI spec defines all required schemas", () => {
        const content = readFileSync(
            resolve(ROOT, "docs/api/openapi.yaml"),
            "utf-8",
        );

        const requiredSchemas = [
            "ShoppingList",
            "Section",
            "Item",
            "Template",
            "TemplateItem",
            "HistoryEntry",
            "ExportData",
            "ImportOptions",
        ];

        const missing: string[] = [];
        for (const schema of requiredSchemas) {
            if (!content.includes(`${schema}:`)) {
                missing.push(schema);
            }
        }

        expect(missing).toEqual([]);
    });

    test("environment variables are documented in README", () => {
        const content = readFileSync(resolve(ROOT, "README.md"), "utf-8");

        const requiredVars = [
            "APP_PASSWORD",
            "DISABLE_AUTH",
            "API_TOKEN",
            "PORT",
            "DATABASE_PATH",
            "SESSION_SECRET",
        ];

        const missing: string[] = [];
        for (const envVar of requiredVars) {
            if (!content.includes(envVar)) {
                missing.push(envVar);
            }
        }

        expect(missing).toEqual([]);
    });

    test("docs files are not empty", () => {
        const docsDir = resolve(ROOT, "docs");
        const mdFiles = getMarkdownFiles(docsDir);
        const emptyFiles: string[] = [];

        for (const relPath of mdFiles) {
            const fullPath = resolve(docsDir, relPath);
            const content = readFileSync(fullPath, "utf-8").trim();
            if (content.length < 100) {
                emptyFiles.push(relPath);
            }
        }

        expect(emptyFiles).toEqual([]);
    });

    test("all service factory functions have JSDoc comments", () => {
        const serviceFiles = [
            "server/src/services/lists.ts",
            "server/src/services/sections.ts",
            "server/src/services/items.ts",
            "server/src/services/templates.ts",
            "server/src/services/sessions.ts",
            "server/src/services/rate-limits.ts",
            "server/src/services/import-export.ts",
        ];

        const missingJsdoc: string[] = [];
        for (const file of serviceFiles) {
            const content = readFileSync(resolve(ROOT, file), "utf-8");
            const exportFunctions = content.match(
                /export function \w+/g,
            );
            if (exportFunctions) {
                for (const fn of exportFunctions) {
                    const fnName = fn.replace("export function ", "");
                    const fnIndex = content.indexOf(fn);
                    const before = content.substring(
                        Math.max(0, fnIndex - 200),
                        fnIndex,
                    );
                    if (!before.includes("/**")) {
                        missingJsdoc.push(`${file}: ${fnName}`);
                    }
                }
            }
        }

        expect(missingJsdoc).toEqual([]);
    });
});
