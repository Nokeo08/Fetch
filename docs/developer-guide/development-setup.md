# Development Setup

## Prerequisites

- [Bun](https://bun.sh) >= 1.2.0
- [Git](https://git-scm.com)
- A code editor (VS Code recommended for TypeScript support)

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/Nokeo08/Fetch
cd fetch
bun install
```

This installs dependencies for all three workspaces (`client`, `server`, `shared`) and runs the postinstall script to build `shared` and `server` types.

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```
APP_PASSWORD=your-dev-password
```

### 3. Start Development Servers

```bash
# Start everything (client + server + shared watch)
bun run dev

# Or run individually:
bun run dev:client    # Frontend at http://localhost:5173
bun run dev:server    # Backend at http://localhost:3000
```

The client dev server (Vite) proxies API requests to the backend. Hot module replacement is enabled for instant feedback.

### 4. Stop Development Servers

```bash
# Kill any lingering dev processes
bun run kill
```

## Running Tests

```bash
# Run all tests via Turbo
bun run test

# Run tests directly with Bun (faster iteration)
bun test

# Single test file
bun test src/services/lists.test.ts

# Tests matching a pattern
bun test -t "should create a list"

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

Tests use an in-memory SQLite database (`DATABASE_PATH=:memory:`) and have auth disabled (`DISABLE_AUTH=true`) by default via `server/src/test-setup.ts`.

## Code Style Guide

The project uses strict TypeScript with the following conventions:

### Formatting

- **Indentation**: 4 spaces
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Comments**: Avoid unless explicitly needed for complex logic

### Imports

```typescript
// External imports first
import { useState } from "react";
import type { Foo } from "bar";

// Blank line, then workspace imports
import type { ApiResponse } from "shared/dist";
```

Use the `type` keyword for type-only imports (`import type { ... }`). This is enforced by `verbatimModuleSyntax: true`.

### Naming Conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Variables/functions | camelCase | `myVariable`, `getItems` |
| React components | PascalCase | `ListDetail`, `Settings` |
| Types | PascalCase | `ShoppingList`, `ApiResponse` |
| Files (utilities) | camelCase | `fuzzySearch.ts` |
| Files (components) | PascalCase | `ListDetail.tsx` |
| Constants | UPPER_SNAKE_CASE | `SERVER_URL`, `SCHEMA_VERSION` |

### TypeScript Strictness

- `strict: true` -- All strict checks enabled
- `verbatimModuleSyntax: true` -- Explicit `type` imports
- `noUncheckedIndexedAccess: true` -- Array access may be `undefined`

Array access requires null checks:

```typescript
const items = getItems();
const first = items[0]; // Type: Item | undefined
if (first) {
    console.log(first.name); // Safe
}
```

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

### Linting

```bash
bun run lint
```

The project uses ESLint with TypeScript and React hooks plugins.

## Git Workflow

### Branch Naming

- `feature/your-feature-name` -- New features
- `fix/bug-description` -- Bug fixes
- `docs/documentation-update` -- Documentation changes
- `refactor/component-name` -- Code refactoring

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pre-Commit Checklist

Run all checks before committing:

```bash
bun run build        # No build errors
bun run lint         # No linting issues
bun run type-check   # No type errors
bun run test         # All tests pass
```

## Building for Production

```bash
# Build all workspaces
bun run build

# Build specific workspace
bun run build --filter=shared
bun run build --filter=client
bun run build --filter=server
```

Build order matters: if you modify shared types, build `shared` first:

```bash
bun run build --filter=shared
```

## Adding a New Feature

1. **Define types** in `shared/src/types/` and rebuild shared
2. **Create service** in `server/src/services/` with a factory function
3. **Add routes** inside `createApiRoutes()` in `server/src/index.ts` (relative paths, no `/api/v1` prefix)
4. **Write tests** for the service and route integration
5. **Create frontend** components in `client/src/`
6. **Add API client** in `client/src/api/`

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full contribution workflow.
