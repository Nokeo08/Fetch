# Agent Guidelines for Fetch

> A TypeScript monorepo using Bun, Hono, Vite, React, and Turbo. Self-hosted shopping list PWA.

## Commands

```bash
# Development
bun run dev              # All workspaces
bun run dev:client       # Frontend only
bun run dev:server       # Backend only
bun run kill             # Stop lingering dev processes

# Build
bun run build            # All workspaces
bun run build --filter=shared  # After modifying shared types

# Lint & Type-check
bun run lint
bun run type-check

# Test (via Turbo - builds dependencies first)
bun run test             # All tests via Turbo

# Test (direct Bun - faster, no dependency build)
bun test                            # All tests
bun test server/src/services/items.test.ts  # Single file
bun test -t "should create item"    # Match test name pattern
bun test --watch                    # Watch mode
bun test --coverage                 # With coverage (90% threshold)
```

Tests use Bun's built-in test runner. A preload script (`server/src/test-setup.ts`) sets `DISABLE_AUTH=true`, `APP_PASSWORD=test-password`, and `DATABASE_PATH=:memory:` for all tests.

## Code Style

### Formatting
- **Indentation**: 4 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Comments**: No comments unless explicitly requested

### Imports
```typescript
// External imports first
import { useState } from "react";
import type { Foo } from "bar";  // Use 'type' keyword for type-only imports

// Blank line, then workspace imports
import type { ApiResponse } from "shared/dist";
```

### Naming
- **Variables/functions**: camelCase (`myVariable`)
- **Components**: PascalCase (`MyComponent`)
- **Types**: PascalCase (`UserData`)
- **Files**: camelCase for utilities, PascalCase for React components
- **Constants**: UPPER_SNAKE_CASE (`SERVER_URL`)

### TypeScript
- `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`
- Use explicit return types for exported functions
- Prefer `type` over `interface`
- Array access may be undefined due to `noUncheckedIndexedAccess` — always null-check `arr[0]`

### Error Handling
```typescript
try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
} catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(message);
}
```

Server uses `HttpError` class with factory methods (`HttpError.badRequest()`, `.notFound()`, `.unauthorized()`, etc.) from `middleware/error.ts`.

## API Routes (`server/src/index.ts`)

### Route Structure
1. **Public routes**: Login, logout, health — registered on `app`
2. **Protected routes**: All `/api/v1/*` — defined inside `createApiRoutes()`

### Adding Endpoints
```typescript
// CORRECT - inside createApiRoutes(), relative path
.get("/my-endpoint", (c) => { ... })

// WRONG - on app with full path (unreachable due to notFound handler)
app.get("/api/v1/my-endpoint", (c) => { ... })
```

- Paths inside `createApiRoutes` must NOT include the `/api/v1` prefix
- Auth middleware is applied globally — do not add `requireAuth()` to individual routes
- After adding routes: run tests, manually test, add integration tests to `server/src/index.test.ts`

## Service Pattern

Services use a factory function pattern returning an object with methods:

```typescript
export function createItemsService(db: Database) {
    return {
        getById(id: string) { ... },
        create(data: CreateItemRequest) { ... },
    };
}
```

Services: `lists`, `sections`, `items`, `sessions`, `rate-limits`, `templates`, `import-export`.

## Database Migrations (`server/src/db/migrations.ts`)

```typescript
{
    version: 4,
    name: "add_new_column",
    up: (db: Database) => {
        if (!hasColumn(db, "table", "column")) {
            db.exec("ALTER TABLE table ADD COLUMN column TEXT");
        }
    },
    verify: (db: Database) => hasColumn(db, "table", "column"),
    down: "ALTER TABLE table DROP COLUMN column",
}
```

- Always add a `verify` function to prevent silent failures
- Update `SCHEMA_VERSION` in `schema.ts`

## Testing

Tests live alongside source files (`*.test.ts`). The test infrastructure uses:

- **Test helpers** (`server/src/test-helpers/`): `createTestApp()`, `createAuthenticatedApp()`, `createTestDb()`, `createTestServices()`
- **Factories**: `createTestList()`, `createTestSection()`, `createTestItem()`, `createTestTemplate()`
- **In-memory SQLite**: All tests use `:memory:` database — no cleanup needed

Test categories in `server/src/`:
- Unit tests: `services/*.test.ts`, `db/*.test.ts`, `middleware/*.test.ts`
- Integration tests: `integration/*.test.ts`, `index.test.ts`
- E2E tests: `e2e/*.test.ts`
- Performance/security: `performance/`, `security/`

## React Patterns

### Provider Hierarchy (in `main.tsx`)
```
QueryClientProvider > BrowserRouter > I18nProvider > AuthProvider > OfflineProvider > WebSocketProvider
```

### Modals
```typescript
const modalRef = useRef<HTMLDivElement>(null);
useEffect(() => {
    if (showModal && modalRef.current) modalRef.current.focus();
}, [showModal]);
<div ref={modalRef} tabIndex={-1} onKeyDown={(e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") closeModal();
}}>
```

### Forms
- Use `useState` for form state
- Handle `onKeyDown` for Enter key submission
- Disable submit button when form is invalid or submitting

## Project Structure

```
client/src/          # React 19 + Vite 6 frontend
  api/               #   API client modules (listsApi, sectionsApi, etc.)
  i18n/              #   Internationalization (15 languages)
  App.tsx            #   Main lists view component
  AppRoutes.tsx      #   React Router route definitions
  AuthContext.tsx     #   Auth provider (cookie-based sessions)
  OfflineContext.tsx  #   Offline support with IndexedDB + operation queue
  WebSocketContext.tsx #  WebSocket provider (reconnect, heartbeat)
server/src/          # Hono backend on Bun runtime
  config/            #   App configuration and env vars
  db/                #   SQLite schema, client, and migrations
  middleware/        #   Auth, error handling, logging, security headers
  services/          #   Business logic (lists, sections, items, templates, etc.)
  sync/              #   WebSocket broadcast helpers
  test-helpers/      #   Test factories and utilities
  websocket/         #   WebSocket connection manager
  index.ts           #   Hono app and all route definitions
  server.ts          #   Bun.serve() entry point with graceful shutdown
shared/src/types/    # Shared TypeScript type definitions
  entities.ts        #   Data models (ShoppingList, Section, Item, Template, etc.)
  api.ts             #   API request/response types (ApiResponse<T>)
  events.ts          #   WebSocket message types
```

## Environment Variables

- **Client**: `import.meta.env.VITE_*` (must start with `VITE_`; envDir is `../` from client)
- **Server**: `process.env.*` or `Bun.env.*`
- Key vars: `PORT`, `APP_PASSWORD`, `DISABLE_AUTH`, `API_TOKEN`, `DATABASE_PATH`, `SESSION_SECRET`
- Never commit `.env` files

## Pre-commit Checklist

1. `bun run build` — no build errors
2. `bun run lint` — fix linting issues
3. `bun run type-check` — verify type safety
4. `bun run test` — all tests pass

## Important Notes

- Always build `shared` before running client/server if shared types changed
- Bun is the package manager — do not use npm/yarn
- Use Hono's RPC client (`hcWithType`) for type-safe API calls from the client
- The user prefers "Add" over "Create" in UI verbiage
- Feature specs with acceptance criteria live in `/openspec/` (OpenSpec workflow)
