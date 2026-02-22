# Agent Guidelines for Fetch

> This is a TypeScript monorepo using Bun, Hono, Vite, React, and Turbo.

## Build Commands

```bash
# Install dependencies
bun install

# Development (all workspaces)
bun run dev

# Development (specific workspace)
bun run dev:client    # Vite React frontend
bun run dev:server    # Hono backend
```

## Build Commands

```bash
# Build all workspaces
bun run build

# Build specific workspace
bun run build:client
bun run build:server

# Build shared only (required after modifying shared types)
bun run build --filter=shared
```

## Lint/Type-check Commands

```bash
# Lint all workspaces
bun run lint

# Lint specific workspace
bun run lint --filter=client

# Type check all workspaces
bun run type-check
```

## Test Commands

```bash
# Run all tests (via Turbo)
bun run test

# Run tests in specific workspace
cd client && bun test
cd server && bun test

# Run single test file
bun test src/utils.test.ts

# Run tests matching pattern
bun test -t "test name pattern"

# Run with watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

## Code Style Guidelines

### Formatting
- **Indentation**: 4 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Line width**: No strict limit, keep readable
- **Trailing commas**: Use where appropriate (multiline)

### Imports
- Use `type` keyword for type imports: `import type { Foo } from "bar"`
- External imports first, then internal/workspace imports
- React imports: `import { useState } from "react"`
- Workspace imports use package name with `/dist`: `import type { ApiResponse } from "shared/dist"`
- Group imports logically with blank lines between groups

### Naming Conventions
- **Variables/functions**: camelCase (`myVariable`, `myFunction`)
- **Components**: PascalCase (`MyComponent`)
- **Types**: PascalCase (`UserData`, `ApiResponse`)
- **Files**: camelCase for utilities, PascalCase for components
- **Constants**: UPPER_SNAKE_CASE for true constants (`SERVER_URL`)

### TypeScript
- `strict: true` enabled in all tsconfig files
- `verbatimModuleSyntax: true` - use `import type` for types
- `noUncheckedIndexedAccess: true` - array access may be undefined
- Use explicit return types for exported functions
- Prefer `type` over `interface` for object shapes
- Use `satisfies` operator when appropriate
- Export types using `export type { Foo }` when re-exporting

### Error Handling
- Always handle Promise rejections with try/catch
- Throw descriptive errors with context
- Use type guards for error narrowing: `if (err instanceof Error)`
- Check response.ok before parsing JSON in API calls
- Log errors appropriately before throwing

### React Patterns
- Use functional components with hooks
- Prefer `useMutation` from @tanstack/react-query for API calls
- Use `StrictMode` in development
- Handle loading, error, and success states explicitly
- Use type assertions for API response types: `const res: ApiResponse = await req.json()`

### Hono Server Patterns
- Export the Hono app as default for RPC client usage
- Use `.use(cors())` for CORS support
- Chain route definitions fluently
- Return typed responses using shared types
- Export `AppType` for RPC client type inference

### API Routes

All API routes are defined in `server/src/index.ts`:

1. **Public routes** (no auth): Login, logout, health checks - registered directly on `app`
2. **Protected routes** (require auth): All `/api/v1/*` routes - defined inside `createApiRoutes()`

#### Adding New API Endpoints

**Always add new endpoints inside `createApiRoutes()`:**

```typescript
// ✅ CORRECT - inside createApiRoutes, relative path
.get("/my-endpoint", (c) => { ... })

// ❌ WRONG - on app, full path (will be unreachable due to notFound handler)
app.get("/api/v1/my-endpoint", (c) => { ... })
```

**Route paths inside `createApiRoutes` should NOT include `/api/v1` prefix:**
- Use `/templates` not `/api/v1/templates`
- Use `/lists/:id` not `/api/v1/lists/:id`

**Auth is applied globally** - don't add `.use(requireAuth(...))` to individual routes inside `createApiRoutes`.

#### Testing New Routes

After adding new API routes:
1. Run existing tests: `bun test`
2. **Manually test the new endpoint** with the dev server running
3. Add integration tests for new routes to `server/src/index.test.ts`

### Project Structure
```
client/          # React + Vite frontend
  src/
    App.tsx      # Main application component
    main.tsx     # Entry point with providers
server/          # Hono backend
  src/
    index.ts     # Hono app and routes
    client.ts    # RPC client type exports
shared/          # Shared types/utilities
  src/
    types/       # TypeScript definitions
    index.ts     # Re-exports
```

### Workspace Dependencies
- Use `workspace:*` protocol for internal deps
- Shared must be built before client/server can use it
- Import from `shared/dist` for compiled output
- Run `bun run build --filter=shared` after modifying shared types

## Environment Variables

- **Client**: Use `import.meta.env.VITE_*` (must start with VITE_)
- **Server**: Use `process.env.*` or `Bun.env.*`
- Define in `.env` files at workspace root
- Default values: `const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"`

## Pre-commit Checklist

1. `bun run build` - ensure no build errors
2. `bun run lint` - fix any linting issues
3. `bun run type-check` - verify type safety
4. `bun run test` - ensure tests pass

## Important Notes

- Always build `shared` before running client/server if types changed
- Client uses Vite, Server uses Bun runtime
- Use Hono's RPC client (`hcWithType`) for type-safe API calls
- Never commit `.env` files or secrets
- Bun is the package manager - don't use npm/yarn
- Postinstall script auto-builds shared and server packages
