import { describe, test, expect } from "bun:test";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

async function readProjectFileAsync(relativePath: string): Promise<string> {
    return Bun.file(resolve(PROJECT_ROOT, relativePath)).text();
}

async function fileExists(relativePath: string): Promise<boolean> {
    return Bun.file(resolve(PROJECT_ROOT, relativePath)).exists();
}

describe("Docker Configuration", () => {
    describe("Dockerfile", () => {
        let dockerfile: string;

        test("exists", async () => {
            expect(await fileExists("Dockerfile")).toBe(true);
            dockerfile = await readProjectFileAsync("Dockerfile");
        });

        test("uses multi-stage build", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const fromStatements = content.match(/^FROM\s+/gm);
            expect(fromStatements).not.toBeNull();
            expect(fromStatements!.length).toBeGreaterThanOrEqual(2);
        });

        test("stage 1 is named builder", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toContain("AS builder");
        });

        test("uses specific base image tags (not latest)", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const fromLines = content.match(/^FROM\s+.+$/gm) || [];
            for (const line of fromLines) {
                expect(line).not.toContain(":latest");
                const imageRef = line.replace(/^FROM\s+/, "").replace(/\s+AS\s+.*$/, "").trim();
                expect(imageRef).toMatch(/:.+/);
            }
        });

        test("uses alpine-based images for minimal size", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const fromLines = content.match(/^FROM\s+.+$/gm) || [];
            for (const line of fromLines) {
                expect(line).toContain("alpine");
            }
        });

        test("creates non-root user", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toMatch(/adduser/);
            expect(content).toMatch(/addgroup/);
            expect(content).toContain("USER fetch");
        });

        test("sets USER directive before CMD", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const userIndex = content.lastIndexOf("USER fetch");
            const cmdIndex = content.indexOf("CMD [");
            expect(userIndex).toBeLessThan(cmdIndex);
            expect(userIndex).toBeGreaterThan(-1);
        });

        test("has HEALTHCHECK configured", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toContain("HEALTHCHECK");
            expect(content).toContain("--interval=30s");
            expect(content).toContain("--timeout=3s");
            expect(content).toContain("--retries=3");
            expect(content).toContain("/health");
        });

        test("exposes port 3000", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toContain("EXPOSE 3000");
        });

        test("sets production environment defaults", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toContain("ENV NODE_ENV=production");
            expect(content).toContain("ENV PORT=3000");
            expect(content).toContain("ENV DATABASE_PATH=/data/fetch.db");
        });

        test("creates data directory for volume", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toMatch(/mkdir.*\/data/);
        });

        test("sets proper ownership on data directory", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toMatch(/chown.*fetch.*\/data/);
        });

        test("copies client build output for static serving", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toMatch(/COPY.*client\/dist.*public/);
        });

        test("runtime stage only copies specific server dependencies (not full node_modules)", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const runtimeStage = content.split(/^FROM\s+oven\/bun/m).pop() || "";
            expect(runtimeStage).toContain("node_modules/hono");
            expect(runtimeStage).toContain("node_modules/dotenv");
            expect(runtimeStage).not.toMatch(/bun install/);
        });

        test("documents environment variables in comments", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            expect(content).toContain("APP_PASSWORD");
            expect(content).toContain("DISABLE_AUTH");
            expect(content).toContain("API_TOKEN");
            expect(content).toContain("PORT");
            expect(content).toContain("DATABASE_PATH");
            expect(content).toContain("SESSION_SECRET");
        });

        test("does not contain secrets or sensitive values", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const envLines = content.match(/^ENV\s+.+$/gm) || [];
            for (const line of envLines) {
                expect(line).not.toMatch(/APP_PASSWORD=/);
                expect(line).not.toMatch(/API_TOKEN=\S+/);
                expect(line).not.toMatch(/SESSION_SECRET=\S+/);
            }
        });

        test("uses frozen lockfile for reproducible builds", async () => {
            const content = await readProjectFileAsync("Dockerfile");
            const installLines = content.match(/bun install.*/g) || [];
            for (const line of installLines) {
                expect(line).toContain("--frozen-lockfile");
            }
        });
    });

    describe(".dockerignore", () => {
        test("exists", async () => {
            expect(await fileExists(".dockerignore")).toBe(true);
        });

        test("excludes .git", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain(".git");
        });

        test("excludes node_modules", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain("node_modules");
        });

        test("excludes test files", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toMatch(/\*\.test\.ts/);
        });

        test("excludes documentation", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain("README.md");
            expect(content).toContain("CONTRIBUTING.md");
        });

        test("excludes environment files", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain(".env");
            expect(content).toContain(".env.local");
        });

        test("excludes database files", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain("*.db");
            expect(content).toContain("data/");
        });

        test("excludes IDE files", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain(".vscode");
            expect(content).toContain(".idea");
        });

        test("excludes build artifacts", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain("dist");
            expect(content).toContain(".turbo");
        });

        test("excludes stories directory", async () => {
            const content = await readProjectFileAsync(".dockerignore");
            expect(content).toContain("stories/");
        });
    });

    describe("compose.yaml", () => {
        test("exists", async () => {
            expect(await fileExists("compose.yaml")).toBe(true);
        });

        test("defines fetch service", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("fetch:");
        });

        test("configures build context", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("build:");
            expect(content).toContain("context:");
            expect(content).toContain("dockerfile: Dockerfile");
        });

        test("maps port", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toMatch(/ports:/);
            expect(content).toMatch(/3000/);
        });

        test("configures environment variables", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("APP_PASSWORD");
            expect(content).toContain("DATABASE_PATH");
            expect(content).toContain("SESSION_SECRET");
            expect(content).toContain("NODE_ENV=production");
        });

        test("configures volume for data persistence", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("volumes:");
            expect(content).toContain("fetch-data:");
            expect(content).toContain("/data");
        });

        test("sets restart policy", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("restart: unless-stopped");
        });

        test("configures health check", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("healthcheck:");
            expect(content).toContain("/health");
            expect(content).toContain("interval:");
            expect(content).toContain("timeout:");
            expect(content).toContain("retries:");
        });

        test("uses environment variable substitution for secrets", async () => {
            const content = await readProjectFileAsync("compose.yaml");
            expect(content).toContain("${APP_PASSWORD}");
            expect(content).toContain("${SESSION_SECRET");
        });
    });

    describe("compose.prod.yaml", () => {
        test("exists", async () => {
            expect(await fileExists("compose.prod.yaml")).toBe(true);
        });

        test("configures resource limits", async () => {
            const content = await readProjectFileAsync("compose.prod.yaml");
            expect(content).toContain("resources:");
            expect(content).toContain("limits:");
            expect(content).toContain("memory:");
        });

        test("configures logging", async () => {
            const content = await readProjectFileAsync("compose.prod.yaml");
            expect(content).toContain("logging:");
            expect(content).toContain("max-size");
        });
    });

    describe(".env.example", () => {
        test("exists", async () => {
            expect(await fileExists(".env.example")).toBe(true);
        });

        test("documents all required environment variables", async () => {
            const content = await readProjectFileAsync(".env.example");
            expect(content).toContain("APP_PASSWORD");
            expect(content).toContain("DISABLE_AUTH");
            expect(content).toContain("API_TOKEN");
            expect(content).toContain("PORT");
            expect(content).toContain("DATABASE_PATH");
            expect(content).toContain("SESSION_SECRET");
        });

        test("provides default/example values", async () => {
            const content = await readProjectFileAsync(".env.example");
            expect(content).toContain("PORT=3000");
            expect(content).toContain("DISABLE_AUTH=false");
        });

        test("does not contain real secrets", async () => {
            const content = await readProjectFileAsync(".env.example");
            const passwordLine = content.match(/APP_PASSWORD=.*/)?.[0] || "";
            expect(passwordLine).toContain("your-secure-password");
        });
    });
});

describe("Server Static File Serving", () => {
    test("health endpoint returns healthy status", async () => {
        const { app } = await import("./index");
        const res = await app.request("/health");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe("healthy");
        expect(body.database.status).toBe("connected");
        expect(body.timestamp).toBeDefined();
    });

    test("health endpoint returns database latency", async () => {
        const { app } = await import("./index");
        const res = await app.request("/health");
        const body = await res.json();
        expect(body.database.latency).toBeDefined();
        expect(typeof body.database.latency).toBe("number");
    });

    test("root returns text when no public/index.html exists", async () => {
        const { app } = await import("./index");
        const res = await app.request("/");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("Fetch Shopping List API");
    });

    test("unknown route returns 404 when no public dir exists", async () => {
        const { app } = await import("./index");
        const res = await app.request("/some-random-page");
        expect(res.status).toBe(404);
    });

    test("API routes still work (not overridden by static serving)", async () => {
        const { app } = await import("./index");
        const res = await app.request("/hello");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.message).toBe("Hello Fetch!");
    });
});

describe("README Docker Documentation", () => {
    test("documents docker build command", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("docker build");
    });

    test("documents docker run command", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("docker run");
    });

    test("documents docker compose usage", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("docker compose up");
    });

    test("documents volume mounting", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("/data");
        expect(content).toContain("fetch-data");
    });

    test("lists environment variables", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("APP_PASSWORD");
        expect(content).toContain("DATABASE_PATH");
        expect(content).toContain("SESSION_SECRET");
        expect(content).toContain("DISABLE_AUTH");
    });

    test("documents non-root execution", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("non-root");
    });

    test("documents health check", async () => {
        const content = await readProjectFileAsync("README.md");
        expect(content).toContain("/health");
    });
});
