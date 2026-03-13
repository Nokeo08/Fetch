import type { Config } from "../config/types";

export type TestConfigOverrides = Partial<Config>;

const DEFAULT_TEST_CONFIG: Config = {
    port: 3000,
    auth: { password: "test-password", disabled: false },
    api: {},
    database: { path: ":memory:" },
    session: { secret: "test-secret", maxAge: 7 * 24 * 60 * 60 * 1000 },
    rateLimit: { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
};

export function createTestConfig(overrides?: TestConfigOverrides): Config {
    return {
        ...DEFAULT_TEST_CONFIG,
        ...overrides,
        auth: { ...DEFAULT_TEST_CONFIG.auth, ...overrides?.auth },
        api: { ...DEFAULT_TEST_CONFIG.api, ...overrides?.api },
        database: { ...DEFAULT_TEST_CONFIG.database, ...overrides?.database },
        session: { ...DEFAULT_TEST_CONFIG.session, ...overrides?.session },
        rateLimit: { ...DEFAULT_TEST_CONFIG.rateLimit, ...overrides?.rateLimit },
    };
}
