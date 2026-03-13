import type { Database } from "bun:sqlite";

type DbSession = {
    token: string;
    created_at: string;
    expires_at: string;
    last_activity: string | null;
};

export type Session = {
    token: string;
    createdAt: string;
    expiresAt: string;
    lastActivity: string | null;
};

function mapSession(row: DbSession): Session {
    return {
        token: row.token,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastActivity: row.last_activity,
    };
}

function formatDateForSqlite(date: Date): string {
    return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

/** Creates the sessions service for managing authentication sessions, including creation, validation, expiry, extension, and activity tracking. */
export function createSessionsService(db: Database) {
    return {
        create(expiresInMs: number): Session {
            const token = generateToken();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + expiresInMs);

            db.query(
                "INSERT INTO sessions (token, created_at, expires_at, last_activity) VALUES (?, ?, ?, ?)"
            ).run(token, formatDateForSqlite(now), formatDateForSqlite(expiresAt), formatDateForSqlite(now));

            return {
                token,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                lastActivity: now.toISOString(),
            };
        },

        getByToken(token: string): Session | null {
            const row = db.query<DbSession, [string]>("SELECT * FROM sessions WHERE token = ?").get(token);
            return row ? mapSession(row) : null;
        },

        isValid(token: string): boolean {
            const session = this.getByToken(token);
            if (!session) return false;

            const expiresAt = new Date(session.expiresAt);
            return expiresAt > new Date();
        },

        delete(token: string): boolean {
            const result = db.query("DELETE FROM sessions WHERE token = ?").run(token);
            return result.changes > 0;
        },

        deleteExpired(): number {
            const result = db.query("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')").run();
            return result.changes;
        },

        extend(token: string, expiresInMs: number): Session | null {
            const session = this.getByToken(token);
            if (!session) return null;

            const now = new Date();
            const expiresAt = new Date(now.getTime() + expiresInMs);
            db.query("UPDATE sessions SET expires_at = ?, last_activity = ? WHERE token = ?").run(
                formatDateForSqlite(expiresAt),
                formatDateForSqlite(now),
                token
            );

            return this.getByToken(token);
        },

        updateActivity(token: string): Session | null {
            const session = this.getByToken(token);
            if (!session) return null;

            const now = new Date();
            db.query("UPDATE sessions SET last_activity = ? WHERE token = ?").run(formatDateForSqlite(now), token);

            return this.getByToken(token);
        },
    };
}

function generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type SessionsService = ReturnType<typeof createSessionsService>;
