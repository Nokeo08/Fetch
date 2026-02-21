import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createRateLimitsService, type RateLimitConfig } from "./rate-limits";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("RateLimitsService", () => {
    let db: Database;
    let rateLimitsService: ReturnType<typeof createRateLimitsService>;
    const config: RateLimitConfig = {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        lockoutMs: 30 * 60 * 1000,
    };

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        rateLimitsService = createRateLimitsService(db, config);
    });

    afterEach(() => {
        db.close();
    });

    describe("recordAttempt", () => {
        test("should record first attempt", () => {
            const entry = rateLimitsService.recordAttempt("192.168.1.1");
            expect(entry.attempts).toBe(1);
            expect(entry.lockedUntil).toBeNull();
        });

        test("should increment attempts", () => {
            rateLimitsService.recordAttempt("192.168.1.1");
            rateLimitsService.recordAttempt("192.168.1.1");
            const entry = rateLimitsService.recordAttempt("192.168.1.1");
            expect(entry.attempts).toBe(3);
        });

        test("should lock after max attempts", () => {
            for (let i = 0; i < config.maxAttempts; i++) {
                rateLimitsService.recordAttempt("192.168.1.1");
            }
            const entry = rateLimitsService.getByIp("192.168.1.1");
            expect(entry?.lockedUntil).not.toBeNull();
        });

        test("should reset attempts outside window", () => {
            rateLimitsService.recordAttempt("192.168.1.1");
            rateLimitsService.recordAttempt("192.168.1.1");

            db.query("UPDATE rate_limits SET last_attempt = datetime('now', '-20 minutes')").run();

            const entry = rateLimitsService.recordAttempt("192.168.1.1");
            expect(entry.attempts).toBe(1);
        });
    });

    describe("isLocked", () => {
        test("should return false for new IP", () => {
            expect(rateLimitsService.isLocked("192.168.1.1")).toBe(false);
        });

        test("should return false for IP under limit", () => {
            rateLimitsService.recordAttempt("192.168.1.1");
            rateLimitsService.recordAttempt("192.168.1.1");
            expect(rateLimitsService.isLocked("192.168.1.1")).toBe(false);
        });

        test("should return true for locked IP", () => {
            for (let i = 0; i < config.maxAttempts; i++) {
                rateLimitsService.recordAttempt("192.168.1.1");
            }
            expect(rateLimitsService.isLocked("192.168.1.1")).toBe(true);
        });
    });

    describe("reset", () => {
        test("should reset rate limit for IP", () => {
            for (let i = 0; i < config.maxAttempts; i++) {
                rateLimitsService.recordAttempt("192.168.1.1");
            }
            expect(rateLimitsService.isLocked("192.168.1.1")).toBe(true);

            rateLimitsService.reset("192.168.1.1");
            expect(rateLimitsService.isLocked("192.168.1.1")).toBe(false);
        });
    });

    describe("resetOnSuccess", () => {
        test("should clear rate limit after success", () => {
            rateLimitsService.recordAttempt("192.168.1.1");
            rateLimitsService.recordAttempt("192.168.1.1");

            rateLimitsService.resetOnSuccess("192.168.1.1");

            const remaining = rateLimitsService.getRemainingAttempts("192.168.1.1");
            expect(remaining).toBe(config.maxAttempts);
        });
    });

    describe("getRemainingAttempts", () => {
        test("should return max attempts for new IP", () => {
            expect(rateLimitsService.getRemainingAttempts("192.168.1.1")).toBe(config.maxAttempts);
        });

        test("should return correct remaining attempts", () => {
            rateLimitsService.recordAttempt("192.168.1.1");
            rateLimitsService.recordAttempt("192.168.1.1");
            expect(rateLimitsService.getRemainingAttempts("192.168.1.1")).toBe(config.maxAttempts - 2);
        });
    });

    describe("getLockoutRemaining", () => {
        test("should return 0 for unlocked IP", () => {
            expect(rateLimitsService.getLockoutRemaining("192.168.1.1")).toBe(0);
        });

        test("should return remaining lockout time", () => {
            for (let i = 0; i < config.maxAttempts; i++) {
                rateLimitsService.recordAttempt("192.168.1.1");
            }
            const remaining = rateLimitsService.getLockoutRemaining("192.168.1.1");
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(config.lockoutMs);
        });
    });
});
