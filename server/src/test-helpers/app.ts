import type { Config } from "../config/types";
import type { TestServices } from "./db";
import { createTestConfig } from "./config";
import { createTestDb, createTestServices } from "./db";
import app from "../index";

export type TestApp = {
    app: typeof app;
    services: TestServices;
    config: Config;
    login: () => Promise<string>;
    authenticatedRequest: (path: string, init?: RequestInit) => Promise<Response>;
};

export function createTestApp(): typeof app {
    return app;
}

export function createAuthenticatedApp(services?: TestServices): TestApp {
    const svc = services ?? createTestServices();
    const config = createTestConfig();

    async function login(): Promise<string> {
        const session = svc.sessions.create(config.session.maxAge);
        return session.token;
    }

    async function authenticatedRequest(path: string, init?: RequestInit): Promise<Response> {
        const token = await login();
        const headers = new Headers(init?.headers);
        headers.set("Cookie", `session=${token}`);
        return app.request(path, { ...init, headers });
    }

    return {
        app,
        services: svc,
        config,
        login,
        authenticatedRequest,
    };
}
