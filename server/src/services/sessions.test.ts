import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createSessionsService } from "./sessions";
import { CREATE_TABLES, CREATE_INDEXES } from "../db/schema";

describe("SessionsService", () => {
    let db: Database;
    let sessionsService: ReturnType<typeof createSessionsService>;

    beforeEach(() => {
        db = new Database(":memory:");
        db.exec(CREATE_TABLES);
        db.exec(CREATE_INDEXES);
        sessionsService = createSessionsService(db);
    });

    afterEach(() => {
        db.close();
    });

    describe("create", () => {
        test("should create a session with expiration", () => {
            const expiresInMs = 7 * 24 * 60 * 60 * 1000;
            const session = sessionsService.create(expiresInMs);

            expect(session.token).toBeDefined();
            expect(session.token.length).toBe(64);
            expect(session.createdAt).toBeDefined();
            expect(session.expiresAt).toBeDefined();
        });

        test("should create different tokens for each session", () => {
            const session1 = sessionsService.create(1000);
            const session2 = sessionsService.create(1000);
            expect(session1.token).not.toBe(session2.token);
        });
    });

    describe("getByToken", () => {
        test("should return session by token", () => {
            const created = sessionsService.create(1000);
            const found = sessionsService.getByToken(created.token);
            expect(found?.token).toBe(created.token);
        });

        test("should return null for non-existent token", () => {
            const found = sessionsService.getByToken("nonexistent");
            expect(found).toBeNull();
        });
    });

    describe("isValid", () => {
        test("should return true for valid session", () => {
            const session = sessionsService.create(60 * 60 * 1000);
            expect(sessionsService.isValid(session.token)).toBe(true);
        });

        test("should return false for non-existent session", () => {
            expect(sessionsService.isValid("nonexistent")).toBe(false);
        });

        test("should return false for expired session", () => {
            const session = sessionsService.create(-1);
            expect(sessionsService.isValid(session.token)).toBe(false);
        });
    });

    describe("delete", () => {
        test("should delete session", () => {
            const session = sessionsService.create(1000);
            const result = sessionsService.delete(session.token);
            expect(result).toBe(true);
            expect(sessionsService.getByToken(session.token)).toBeNull();
        });

        test("should return false for non-existent session", () => {
            const result = sessionsService.delete("nonexistent");
            expect(result).toBe(false);
        });
    });

    describe("extend", () => {
        test("should extend session expiration", () => {
            const session = sessionsService.create(1000);
            const extended = sessionsService.extend(session.token, 60 * 60 * 1000);

            expect(extended).toBeDefined();
            expect(extended?.token).toBe(session.token);

            const originalExpiry = new Date(session.expiresAt).getTime();
            const newExpiry = new Date(extended!.expiresAt).getTime();
            expect(newExpiry).toBeGreaterThan(originalExpiry);
        });

        test("should return null for non-existent session", () => {
            const result = sessionsService.extend("nonexistent", 1000);
            expect(result).toBeNull();
        });
    });

    describe("deleteExpired", () => {
        test("should delete expired sessions", () => {
            sessionsService.create(-1000);
            sessionsService.create(-1000);
            const validSession = sessionsService.create(60 * 60 * 1000);

            const deleted = sessionsService.deleteExpired();
            expect(deleted).toBe(2);
            expect(sessionsService.isValid(validSession.token)).toBe(true);
        });
    });
});
