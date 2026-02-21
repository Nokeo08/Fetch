# Contributing to Fetch

Thank you for your interest in contributing to Fetch!

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.2.0
- Git

### Getting Started

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Copy environment file: `cp .env.example .env`
4. Set `APP_PASSWORD` in `.env`
5. Start development: `bun run dev`

## Development Workflow

### Branch Naming

- `feature/your-feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Style

See [AGENTS.md](./AGENTS.md) for detailed code style guidelines.

Key points:
- 4-space indentation
- Double quotes for strings
- Semicolons required
- Use `import type` for type imports

### Testing

```bash
# Run all tests
bun run test

# Run tests in specific workspace
cd server && bun test

# Run single test file
bun test src/services/lists.test.ts

# Run with coverage
bun test --coverage
```

### Before Submitting

1. Run lint: `bun run lint`
2. Run type check: `bun run type-check`
3. Run tests: `bun run test`
4. Build: `bun run build`

All checks must pass before submitting a PR.

## Project Architecture

### Technology Stack

- **Runtime**: Bun
- **Backend**: Hono
- **Frontend**: React + Vite
- **Database**: SQLite (embedded)
- **Build**: Turbo (monorepo)

### Monorepo Structure

- `client/` - Frontend React application
- `server/` - Backend Hono API
- `shared/` - Shared TypeScript types

### Key Patterns

- **Services Layer**: Business logic in `/server/src/services/`
- **Database Layer**: Data access in `/server/src/db/`
- **Type Safety**: Shared types in `/shared/src/types/`
- **RPC Client**: Type-safe API calls via Hono RPC

## Adding New Features

### 1. Define Types

Add types to `shared/src/types/`:

```typescript
export type NewEntity = {
    id: number;
    name: string;
};
```

### 2. Create Service

Add service in `server/src/services/`:

```typescript
export function createNewEntityService(db: Database) {
    return {
        getAll(): NewEntity[] { ... },
        create(name: string): NewEntity { ... },
    };
}
```

### 3. Add Routes

Add routes in `server/src/index.ts`:

```typescript
.get("/api/v1/new-entity", (c) => { ... })
```

### 4. Create Frontend

Add React components in `client/src/`.

## Questions?

Open an issue for bugs or feature requests.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
