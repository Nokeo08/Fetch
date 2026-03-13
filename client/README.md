# Client

React + Vite frontend for Fetch.

## Structure

```
src/
├── api/                 # API client modules
│   ├── lists.ts         # Lists API (CRUD, activate, reorder)
│   ├── sections.ts      # Sections and Items API
│   ├── templates.ts     # Templates API
│   └── import-export.ts # Import/Export API
├── i18n/                # Internationalization (13 languages)
│   ├── I18nContext.tsx   # React context
│   └── {lang}.ts        # Translation files
├── App.tsx              # Main component with routing
├── AuthContext.tsx       # Authentication state
├── WebSocketContext.tsx  # Real-time sync via WebSocket
├── OfflineContext.tsx    # Offline detection and state
├── offlineDb.ts         # IndexedDB for offline storage
├── operationQueue.ts    # Queued operations for offline sync
├── Lists.tsx            # Lists page
├── ListDetail.tsx       # Single list view with sections/items
├── Templates.tsx        # Templates page
├── TemplateDetail.tsx   # Single template view
├── Settings.tsx         # Settings (import/export)
├── Login.tsx            # Authentication page
└── main.tsx             # Entry point
```

## Development

```bash
bun run dev:client    # Start Vite dev server at http://localhost:5173
bun run build         # Production build to dist/
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | `http://localhost:3000` | API base URL |
| `VITE_WS_URL` | auto-detected | WebSocket URL |

Set both to empty strings for production builds (uses relative URLs).

## Key Patterns

- **API layer**: Each module exports typed functions using `fetch()` with `credentials: "include"`
- **Contexts**: `AuthContext`, `WebSocketContext`, `OfflineContext`, `I18nContext` provide global state
- **Real-time**: WebSocket with auto-reconnect (exponential backoff, 1s-30s) and 25s heartbeat
- **Offline**: Service worker caches shell, IndexedDB stores data, operation queue syncs on reconnect
