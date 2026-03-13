# Architecture

## System Overview

Fetch is a full-stack TypeScript monorepo with three workspaces:

```
┌──────────────────────────────────────────────────────┐
│                     Client (PWA)                     │
│              React + Vite + TypeScript               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ React    │  │ IndexedDB│  │ Service Worker    │   │
│  │ Router   │  │ (offline)│  │ (cache + offline) │   │
│  └────┬─────┘  └────┬─────┘  └───────────────────┘   │
│       │              │                               │
│  ┌────┴──────────────┴─────┐  ┌────────────────────┐ │
│  │     API Client Layer    │  │  WebSocket Client  │ │
│  │   (fetch + credentials) │  │  (real-time sync)  │ │
│  └────────────┬────────────┘  └─────────┬──────────┘ │
└───────────────┼─────────────────────────┼────────────┘
                │ HTTP/REST               │ WS
┌───────────────┼─────────────────────────┼────────────┐
│               │        Server           │            │
│          ┌────┴─────────────────────────┴────────┐   │
│          │          Hono Framework               │   │
│          │  ┌──────────────────────────────────┐ │   │
│          │  │         Middleware Stack         │ │   │
│          │  │  CORS → Logger → Error → Security│ │   │
│          │  │  → Auth (on /api/v1/* routes)    │ │   │
│          │  └──────────────────────────────────┘ │   │
│          └──────────────┬────────────────────────┘   │
│                         │                            │
│          ┌──────────────┴───────────────────────┐    │
│          │          Services Layer              │    │
│          │  Lists │ Sections │ Items │ Templates│    │
│          │  Sessions │ RateLimits │ ImportExport│    │
│          └──────────────┬───────────────────────┘    │
│                         │                            │
│          ┌──────────────┴───────────────────────┐    │
│          │          Database Layer              │    │
│          │     SQLite (via bun:sqlite)          │    │
│          │  Schema │ Migrations │ Client        │    │
│          └──────────────────────────────────────┘    │
│                                                      │
│          ┌──────────────────────────────────────┐    │
│          │     WebSocket / Broadcast Layer      │    │
│          │  Connection Manager │ Sync Broadcast │    │
│          └──────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                  Shared Package                      │
│          TypeScript type definitions                 │
│      entities.ts │ api.ts │ events.ts                │
└──────────────────────────────────────────────────────┘
```

## Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | [Bun](https://bun.sh) | Fast JS runtime with built-in SQLite, test runner, and bundler |
| Backend framework | [Hono](https://hono.dev) | Lightweight, fast, TypeScript-first web framework |
| Frontend framework | [React](https://react.dev) | Component-based UI with large ecosystem |
| Build tool | [Vite](https://vitejs.dev) | Fast HMR and optimized production builds |
| Monorepo | [Turbo](https://turbo.build) | Incremental builds and task orchestration |
| Database | SQLite | Zero-config, embedded, single-file database |
| State management | React Context | Simple state management suitable for the app's complexity |
| Data fetching | [@tanstack/react-query](https://tanstack.com/query) | Caching, refetching, and server state management |
| i18n | Custom context | Lightweight translation system with 13 languages |
| Real-time | WebSocket | Native browser support, low latency bidirectional communication |

## Directory Structure

```
fetch/
├── client/src/
│   ├── api/                   # API client modules (one per domain)
│   │   ├── lists.ts           # Lists API (CRUD, activate, reorder)
│   │   ├── sections.ts        # Sections and Items API
│   │   ├── templates.ts       # Templates API
│   │   └── import-export.ts   # Import/Export API
│   ├── i18n/                  # Internationalization
│   │   ├── I18nContext.tsx    # React context for translations
│   │   └── {lang}.ts          # 13 language files
│   ├── App.tsx                # Main app component and routing
│   ├── AuthContext.tsx        # Authentication state management
│   ├── WebSocketContext.tsx   # WebSocket connection and subscriptions
│   ├── OfflineContext.tsx     # Offline detection
│   ├── offlineDb.ts           # IndexedDB for offline data
│   ├── operationQueue.ts      # Queued operations for offline sync
│   ├── Lists.tsx              # Lists page
│   ├── ListDetail.tsx         # Single list view
│   ├── Templates.tsx          # Templates page
│   ├── TemplateDetail.tsx     # Single template view
│   ├── Settings.tsx           # Settings (import/export, etc.)
│   ├── Login.tsx              # Login page
│   └── main.tsx               # Entry point with React Router
│
├── server/src/
│   ├── config/
│   │   ├── index.ts           # Config loading from env vars
│   │   └── types.ts           # Config type definition
│   ├── db/
│   │   ├── client.ts          # Database client initialization
│   │   ├── schema.ts          # Table and index definitions
│   │   └── migrations.ts      # Schema migrations
│   ├── middleware/
│   │   ├── auth.ts            # Session/token authentication
│   │   ├── error.ts           # Error handling and HttpError class
│   │   ├── logger.ts          # Request logging with request IDs
│   │   ├── security.ts        # Security headers and CORS
│   │   └── index.ts           # Middleware exports
│   ├── services/
│   │   ├── lists.ts           # Shopping list business logic
│   │   ├── sections.ts        # Section business logic
│   │   ├── items.ts           # Item business logic + history
│   │   ├── templates.ts       # Template business logic
│   │   ├── sessions.ts        # Session management
│   │   ├── rate-limits.ts     # Login rate limiting
│   │   ├── import-export.ts   # Data import/export
│   │   └── index.ts           # Service exports
│   ├── sync/
│   │   └── broadcast.ts       # WebSocket broadcast helpers
│   ├── websocket/
│   │   └── connection-manager.ts  # WebSocket client tracking
│   ├── utils/
│   │   └── fuzzy-search.ts    # Fuzzy string matching for suggestions
│   ├── index.ts               # Route definitions and app setup
│   └── server.ts              # Server entry point
│
├── shared/src/types/
│   ├── entities.ts            # Domain models (List, Section, Item, etc.)
│   ├── api.ts                 # Request/response types
│   └── events.ts              # WebSocket event types
│
├── Dockerfile                 # Multi-stage production build
├── compose.yaml               # Docker Compose configuration
└── compose.prod.yaml          # Production compose overlay
```

## Data Flow

### REST API Request Flow

```
Client Request
  → CORS Middleware (set headers)
  → Request Logger (assign request ID, start timer)
  → Error Handler (catch and normalize errors)
  → Security Headers (set CSP, HSTS, etc.)
  → Auth Middleware (validate session/token, /api/v1/* only)
  → Route Handler (validate input, call service)
  → Service Layer (business logic, SQL queries)
  → SQLite Database
  → Response (JSON with ApiResponse wrapper)
```

### WebSocket Flow

```
Client connects to /ws
  → Connection Manager registers client with unique ID
  → Client sends ping → Server responds with pong
  → Server broadcasts on data changes:
    Route Handler → Broadcast function → Connection Manager
      → All connected clients receive the update
  → Client receives update → React Query cache invalidation
```

### Offline Sync Flow

```
Online:
  Client → API Request → Server → Response → Update UI

Offline:
  Client → Operation Queue (IndexedDB)
  Client ← Cached Data (IndexedDB)

Reconnection:
  Queue drains → API Requests → Server processes each
  WebSocket reconnects → Real-time updates resume
```

## API Architecture

### Route Organization

Routes are split into two groups:

1. **Public routes** (registered directly on the Hono app):
   - `GET /health` -- Health check
   - `POST /api/login` -- Authentication
   - `POST /api/logout` -- Session termination
   - `GET /api/me` -- Auth status check
   - `GET /ws` -- WebSocket upgrade
   - Static file serving and SPA fallback

2. **Protected routes** (under `/api/v1/*`, auth middleware applied):
   - All CRUD operations for lists, sections, items, templates
   - History and suggestions
   - Import/export

### Response Format

All API responses follow the `ApiResponse<T>` format:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Message", "code": "ERROR_CODE" }
```

### Service Pattern

Each domain has a service factory function:

```typescript
function createListsService(db: Database) {
    return {
        getAll(): ListWithCounts[] { ... },
        create(name: string, icon?: string): ShoppingList { ... },
        // ...
    };
}
```

Services are created once at startup and injected into route handlers via closure. This pattern provides:
- Testability (inject mock database)
- Separation of concerns (routes handle HTTP, services handle logic)
- Type safety (full TypeScript inference on return types)
