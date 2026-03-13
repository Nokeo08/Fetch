# Shared

Shared TypeScript type definitions used by both `client` and `server`.

## Structure

```
src/types/
├── entities.ts   # Domain models: ShoppingList, Section, Item, Template, etc.
├── api.ts        # Request/response types: ApiResponse, CreateListRequest, etc.
├── events.ts     # WebSocket event types: WebSocketMessage, SyncStatus
└── index.ts      # Re-exports all types
```

## Usage

```typescript
import type { ShoppingList, ApiResponse } from "shared/dist";
```

## Building

```bash
bun run build --filter=shared
```

Rebuild after modifying any types. The client and server depend on the compiled output in `dist/`.

## Key Types

- **`ShoppingList`** -- A shopping list with name, icon, sort order, active status
- **`Section`** -- A section within a list
- **`Item`** -- An item with name, description, quantity, status (active/completed/uncertain)
- **`Template`** / **`TemplateItem`** -- Reusable list templates
- **`HistoryEntry`** -- Item usage history for autocomplete
- **`ApiResponse<T>`** -- Standard API response wrapper
- **`WebSocketMessage`** -- Union type for all real-time events
- **`ExportData`** / **`ImportOptions`** -- Import/export data structures
