# Server

Hono backend for Fetch, running on Bun.

## Structure

```
src/
├── config/
│   ├── index.ts              # Config loading from env vars
│   └── types.ts              # Config type definition
├── db/
│   ├── client.ts             # SQLite database initialization
│   ├── schema.ts             # Table and index definitions
│   └── migrations.ts         # Schema migrations
├── middleware/
│   ├── auth.ts               # Session/token authentication
│   ├── error.ts              # Error handling and HttpError class
│   ├── logger.ts             # Request logging with request IDs
│   ├── security.ts           # Security headers and CORS
│   └── index.ts              # Middleware exports
├── services/
│   ├── lists.ts              # Shopping list business logic
│   ├── sections.ts           # Section business logic
│   ├── items.ts              # Item business logic + history/search
│   ├── templates.ts          # Template business logic
│   ├── sessions.ts           # Session management
│   ├── rate-limits.ts        # Login rate limiting
│   ├── import-export.ts      # Data import/export
│   └── index.ts              # Service exports
├── sync/
│   └── broadcast.ts          # WebSocket broadcast helpers
├── websocket/
│   └── connection-manager.ts # WebSocket client tracking
├── utils/
│   └── fuzzy-search.ts       # Fuzzy string matching
├── index.ts                  # Route definitions and app setup
└── server.ts                 # Server entry point
```

## Development

```bash
bun run dev:server    # Start with --watch at http://localhost:3000
bun test              # Run tests with in-memory database
```

## Architecture

- **Routes**: Public routes on `app`, protected routes under `/api/v1/*` via `createApiRoutes()`
- **Services**: Factory functions (`createListsService(db)`) returning typed method objects
- **Middleware**: CORS, logging, error handling, security headers, authentication
- **Database**: SQLite via `bun:sqlite` with schema migrations
- **WebSocket**: Connection manager with broadcast for real-time sync

## Adding Endpoints

Routes inside `createApiRoutes()` use relative paths (no `/api/v1` prefix):

```typescript
.get("/my-endpoint", (c) => { ... })
```

Auth is applied globally to all `/api/v1/*` routes.
