import type { Database } from "bun:sqlite";

type DbRateLimit = {
    ip: string;
    attempts: number;
    last_attempt: string;
    locked_until: string | null;
};

export type RateLimitEntry = {
    ip: string;
    attempts: number;
    lastAttempt: string;
    lockedUntil: string | null;
};

export type RateLimitConfig = {
    maxAttempts: number;
    windowMs: number;
    lockoutMs: number;
};

function mapRateLimit(row: DbRateLimit): RateLimitEntry {
    return {
        ip: row.ip,
        attempts: row.attempts,
        lastAttempt: row.last_attempt,
        lockedUntil: row.locked_until,
    };
}

/** Creates the rate limits service for tracking and enforcing login attempt limits per IP, including lockout management and cleanup. */
export function createRateLimitsService(db: Database, config: RateLimitConfig) {
    return {
        getConfig(): RateLimitConfig {
            return config;
        },

        getByIp(ip: string): RateLimitEntry | null {
            const row = db.query<DbRateLimit, [string]>("SELECT * FROM rate_limits WHERE ip = ?").get(ip);
            return row ? mapRateLimit(row) : null;
        },

        isLocked(ip: string): boolean {
            const entry = this.getByIp(ip);
            if (!entry || !entry.lockedUntil) return false;

            const lockedUntil = new Date(entry.lockedUntil);
            if (lockedUntil <= new Date()) {
                this.reset(ip);
                return false;
            }

            return true;
        },

        recordAttempt(ip: string): RateLimitEntry {
            const existing = this.getByIp(ip);
            const now = new Date();

            if (existing) {
                const lastAttempt = new Date(existing.lastAttempt);
                const windowStart = new Date(now.getTime() - config.windowMs);

                if (lastAttempt < windowStart) {
                    db.query("UPDATE rate_limits SET attempts = 1, last_attempt = ?, locked_until = NULL WHERE ip = ?").run(
                        now.toISOString(),
                        ip
                    );
                } else {
                    const newAttempts = existing.attempts + 1;
                    const lockedUntil = newAttempts >= config.maxAttempts ? new Date(now.getTime() + config.lockoutMs) : null;

                    db.query("UPDATE rate_limits SET attempts = ?, last_attempt = ?, locked_until = ? WHERE ip = ?").run(
                        newAttempts,
                        now.toISOString(),
                        lockedUntil?.toISOString() ?? null,
                        ip
                    );
                }
            } else {
                db.query("INSERT INTO rate_limits (ip, attempts, last_attempt) VALUES (?, 1, ?)").run(ip, now.toISOString());
            }

            return this.getByIp(ip)!;
        },

        reset(ip: string): boolean {
            const result = db.query("DELETE FROM rate_limits WHERE ip = ?").run(ip);
            return result.changes > 0;
        },

        resetOnSuccess(ip: string): void {
            this.reset(ip);
        },

        getRemainingAttempts(ip: string): number {
            const entry = this.getByIp(ip);
            if (!entry) return config.maxAttempts;

            const lastAttempt = new Date(entry.lastAttempt);
            const windowStart = new Date(Date.now() - config.windowMs);

            if (lastAttempt < windowStart) {
                return config.maxAttempts;
            }

            return Math.max(0, config.maxAttempts - entry.attempts);
        },

        getLockoutRemaining(ip: string): number {
            const entry = this.getByIp(ip);
            if (!entry || !entry.lockedUntil) return 0;

            const lockedUntil = new Date(entry.lockedUntil);
            const remaining = lockedUntil.getTime() - Date.now();
            return Math.max(0, remaining);
        },

        cleanup(): number {
            const result = db
                .query("DELETE FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until < datetime('now')")
                .run();
            return result.changes;
        },
    };
}

export type RateLimitsService = ReturnType<typeof createRateLimitsService>;
