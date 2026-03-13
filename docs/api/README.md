# API Reference

Fetch provides a REST API for managing shopping lists, sections, items, templates, and data import/export. All data endpoints require authentication.

- [Authentication Guide](authentication.md)
- [OpenAPI Specification](openapi.yaml)

## Base URL

```
http://localhost:3000
```

## Response Format

All responses use the `ApiResponse` format:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Public (no authentication required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check with database status |
| `POST` | `/api/login` | Authenticate with password |
| `POST` | `/api/logout` | End session |
| `GET` | `/api/me` | Check authentication status |

### Lists (requires authentication)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/lists` | Get all lists with item/section counts |
| `POST` | `/api/v1/lists` | Create a list |
| `GET` | `/api/v1/lists/:id` | Get a single list |
| `PUT` | `/api/v1/lists/:id` | Update a list |
| `DELETE` | `/api/v1/lists/:id` | Delete a list (cascades) |
| `POST` | `/api/v1/lists/:id/activate` | Set as active list |
| `POST` | `/api/v1/lists/reorder` | Reorder lists |
| `POST` | `/api/v1/lists/:id/template` | Create template from list |

### Sections

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/lists/:id/sections` | Get sections with items |
| `POST` | `/api/v1/lists/:id/sections` | Create a section |
| `GET` | `/api/v1/sections/:id` | Get a single section |
| `PUT` | `/api/v1/sections/:id` | Update a section |
| `DELETE` | `/api/v1/sections/:id` | Delete a section (cascades) |
| `POST` | `/api/v1/sections/reorder` | Reorder sections |
| `GET` | `/api/v1/sections/:id/items` | Get items in a section |
| `POST` | `/api/v1/sections/:id/items` | Create an item in a section |

### Items

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/items/:id` | Get a single item |
| `PUT` | `/api/v1/items/:id` | Update an item |
| `DELETE` | `/api/v1/items/:id` | Delete an item |
| `POST` | `/api/v1/items/:id/move` | Move item to another section |
| `POST` | `/api/v1/items/reorder` | Reorder items |

### History and Suggestions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/history` | Get item history |
| `DELETE` | `/api/v1/history/:id` | Delete a history entry |
| `GET` | `/api/v1/suggestions` | Autocomplete suggestions |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/templates` | Get all templates with items |
| `POST` | `/api/v1/templates` | Create a template |
| `GET` | `/api/v1/templates/:id` | Get a template with items |
| `PUT` | `/api/v1/templates/:id` | Update a template |
| `DELETE` | `/api/v1/templates/:id` | Delete a template |
| `POST` | `/api/v1/templates/:id/items` | Add item to template |
| `PUT` | `/api/v1/templates/:templateId/items/:itemId` | Update template item |
| `DELETE` | `/api/v1/templates/:templateId/items/:itemId` | Delete template item |
| `POST` | `/api/v1/templates/:id/reorder` | Reorder template items |
| `POST` | `/api/v1/templates/:id/apply` | Apply template to a list |

### Import/Export

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/export/summary` | Get exportable data summary |
| `POST` | `/api/v1/export` | Export data as JSON |
| `POST` | `/api/v1/import/preview` | Validate and preview import |
| `POST` | `/api/v1/import` | Import data |

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `BAD_REQUEST` | 400 | Invalid request body or parameters |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate list name) |
| `TOO_MANY_REQUESTS` | 429 | Rate limited (login attempts) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Rate Limiting

Login attempts are rate limited per IP address:

- **Max attempts**: 5 within a 15-minute window
- **Lockout duration**: 30 minutes after exceeding the limit
- **Reset**: Successful login resets the counter

Rate limited responses include a `Retry-After` header with the remaining lockout time in seconds.

## WebSocket

Connect to `/ws` for real-time updates. The WebSocket broadcasts events when data changes:

| Event Type | Data | Trigger |
|-----------|------|---------|
| `item_created` | `{ item }` | Item added |
| `item_updated` | `{ item }` | Item modified |
| `item_deleted` | `{ itemId }` | Item removed |
| `item_moved` | `{ item }` | Item moved to another section |
| `section_created` | `{ section }` | Section added |
| `section_updated` | `{ section }` | Section modified |
| `section_deleted` | `{ sectionId }` | Section removed |
| `list_created` | `{ list }` | List added |
| `list_updated` | `{ list }` | List modified |
| `list_deleted` | `{ listId }` | List removed |

The WebSocket supports `ping`/`pong` messages for keepalive.
