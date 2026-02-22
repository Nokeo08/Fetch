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

# Test
bun run test             # All tests via Turbo
bun test                 # Run directly with Bun
bun test src/file.test.ts    # Single test file
bun test -t "pattern"        # Tests matching pattern
bun test --watch             # Watch mode
bun test --coverage          # With coverage
```

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
import type { Foo } from "bar";  // Use 'type' keyword for type imports

// Blank line, then workspace imports
import type { ApiResponse } from "shared/dist";
```

### Naming
- **Variables/functions**: camelCase (`myVariable`)
- **Components**: PascalCase (`MyComponent`)
- **Types**: PascalCase (`UserData`)
- **Files**: camelCase for utilities, PascalCase for components
- **Constants**: UPPER_SNAKE_CASE (`SERVER_URL`)

### TypeScript
- `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`
- Use explicit return types for exported functions
- Prefer `type` over `interface`
- Array access may be undefined: `arr[0]` needs null check

### Error Handling
```typescript
// Always handle Promise rejections
try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
} catch (err) {
    // Use type guard for error narrowing
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(message);
}
```

## API Routes (`server/src/index.ts`)

### Route Structure
1. **Public routes**: Login, logout, health - registered on `app`
2. **Protected routes**: All `/api/v1/*` - defined inside `createApiRoutes()`

### Adding Endpoints
```typescript
// ✅ CORRECT - inside createApiRoutes, relative path
.get("/my-endpoint", (c) => { ... })

// ❌ WRONG - on app, full path (unreachable due to notFound handler)
app.get("/api/v1/my-endpoint", (c) => { ... })
```

- Paths inside `createApiRoutes` should NOT include `/api/v1` prefix
- Auth is applied globally - no need for `.use(requireAuth(...))` on individual routes
- After adding routes: run tests, manually test, add integration tests to `server/src/index.test.ts`

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
    verify: (db: Database) => hasColumn(db, "table", "column"),  // Required for critical migrations
    down: "ALTER TABLE table DROP COLUMN column",
}
```

- Always add `verify` function to prevent silent failures
- Update `SCHEMA_VERSION` in `schema.ts`

## React Patterns

### Modals
```typescript
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    if (showModal && modalRef.current) {
        modalRef.current.focus();  // Focus for keyboard events
    }
}, [showModal]);

// Modal needs tabIndex for keyboard events
<div ref={modalRef} tabIndex={-1} onKeyDown={(e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") closeModal();
}}>
```

### Forms
- Use `useState` for form state
- Handle `onKeyDown` for Enter key submission
- Disable submit button when form invalid or submitting

## Project Structure

```
client/src/          # React + Vite frontend
  api/               # API client modules
  App.tsx            # Main component
  main.tsx           # Entry point with routing
server/src/          # Hono backend
  db/                # Schema and migrations
  services/          # Business logic (lists, sections, items, templates)
  middleware/        # Auth, logging, error handling
  index.ts           # App and routes
shared/src/types/    # Shared TypeScript definitions
stories/             # Feature specifications with acceptance criteria
```

## Environment Variables

- **Client**: `import.meta.env.VITE_*` (must start with VITE_)
- **Server**: `process.env.*` or `Bun.env.*`
- Never commit `.env` files

## Pre-commit Checklist

1. `bun run build` - no build errors
2. `bun run lint` - fix linting issues
3. `bun run type-check` - verify type safety
4. `bun run test` - all tests pass

## Important Notes

- Always build `shared` before running client/server if types changed
- Client uses Vite, Server uses Bun runtime
- Use Hono's RPC client (`hcWithType`) for type-safe API calls
- Bun is the package manager - don't use npm/yarn
- The user prefers "Add" over "Create" in UI verbiage
- Story files in `/stories/*.md` define acceptance criteria for features
