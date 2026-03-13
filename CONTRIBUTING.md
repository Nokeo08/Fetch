# Contributing to Fetch

Thank you for your interest in contributing to Fetch!

## How to Contribute

1. **Report bugs** -- Open an issue with steps to reproduce
2. **Suggest features** -- Open an issue describing the feature and its use case
3. **Submit code** -- Fork the repo, create a branch, and open a pull request

## Code of Conduct

- Be respectful and constructive in all interactions
- Focus on the technical merits of contributions
- Welcome newcomers and help them get started
- Assume good intent

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

See [Development Setup](docs/developer-guide/development-setup.md) for detailed instructions.

## Pull Request Process

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the [code style guide](#code-style)

3. Write or update tests for your changes

4. Run the full check suite:
   ```bash
   bun run build        # No build errors
   bun run lint         # No linting issues
   bun run type-check   # No type errors
   bun run test         # All tests pass
   ```

5. Commit with a conventional commit message:
   ```
   type(scope): description
   ```
   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

6. Push your branch and open a pull request

7. Describe what your PR does, why, and how to test it

### PR Review Criteria

- All CI checks pass (build, lint, type-check, tests)
- Code follows project conventions
- New functionality includes tests
- Breaking changes are documented

## Branch Naming

- `feature/your-feature-name` -- New features
- `fix/bug-description` -- Bug fixes
- `docs/documentation-update` -- Documentation changes
- `refactor/component-name` -- Code refactoring

## Code Style

See [AGENTS.md](AGENTS.md) for the complete code style reference.

Key points:

- **Indentation**: 4 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Imports**: Use `import type` for type-only imports. External imports first, then workspace imports separated by a blank line.
- **Naming**: camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE_CASE for constants
- **Comments**: Avoid unless explicitly needed for complex logic
- **TypeScript**: `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`

## Testing

```bash
# Run all tests
bun run test

# Run tests in a specific workspace
bun test
# from within server/ or client/

# Single test file
bun test src/services/lists.test.ts

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

Tests use an in-memory SQLite database with auth disabled.

## Adding New Features

1. **Define types** in `shared/src/types/` and rebuild: `bun run build --filter=shared`
2. **Create service** in `server/src/services/` using the factory pattern
3. **Add routes** inside `createApiRoutes()` in `server/src/index.ts` (use relative paths without the `/api/v1` prefix)
4. **Write tests** for both the service layer and route integration
5. **Build frontend** components in `client/src/`
6. **Add API client** functions in `client/src/api/`

See [Architecture](docs/developer-guide/architecture.md) for a detailed overview of the codebase.

## Issue Templates

When filing an issue, please include:

### Bug Reports
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, browser, Bun version, Docker version if applicable)
- Error messages or logs

### Feature Requests
- Description of the feature
- Use case / motivation
- Proposed implementation (optional)

## Development Roadmap

Feature specifications are tracked in the `stories/` directory. Each story file includes acceptance criteria, technical notes, and implementation guidance.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0-only](LICENSE) license.
