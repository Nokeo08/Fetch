// This file is preloaded before test files via bunfig.toml
process.env.DISABLE_AUTH = "true";
process.env.APP_PASSWORD = "test-password";
process.env.DATABASE_PATH = ":memory:";
