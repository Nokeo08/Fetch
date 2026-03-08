# Story 14: REST API

**Priority:** Medium  
**Phase:** 4 - Polish & API  
**Estimate:** 3-4 days  
**Dependencies:** Story 8

## Story

As a developer, I want a REST API so that I can integrate Fetch with other applications and automate workflows.

## Acceptance Criteria

### API Authentication
- [x] API token configurable via `API_TOKEN` environment variable
- [x] Token passed in `Authorization: Bearer <token>` header
- [x] Returns 401 for missing/invalid token
- [x] Separate from session-based web auth
- [x] Can use both auth methods simultaneously

### API Versioning
- [x] Base URL: `/api/v1`
- [x] Version in URL path

### Response Format
All responses use consistent JSON format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- [x] 200 - Success (GET, PUT, DELETE)
- [x] 201 - Created (POST)
- [x] 400 - Bad Request (validation error)
- [x] 401 - Unauthorized (invalid token)
- [x] 404 - Not Found
- [x] 429 - Too Many Requests (rate limit)
- [x] 500 - Internal Server Error

Note: DELETEs return 200 with `{ success: true }` rather than 204 No Content, for consistency with the rest of the API response format.

### Lists Endpoints
- [x] `GET /api/v1/lists` - List all lists
  - Response: Array of lists with item counts

- [x] `GET /api/v1/lists/:id` - Get single list
  - Response: List with sections and items

- [x] `POST /api/v1/lists` - Create list
  - Body: `{ name, icon }`
  - Response: Created list (201)

- [x] `PUT /api/v1/lists/:id` - Update list
  - Body: `{ name, icon, isActive }`
  - Response: Updated list

- [x] `DELETE /api/v1/lists/:id` - Delete list
  - Response: `{ success: true }`

- [x] `POST /api/v1/lists/reorder` - Reorder lists
  - Body: `{ ids: number[] }`

- [x] `POST /api/v1/lists/:id/activate` - Set list as active

### Sections Endpoints
- [x] `GET /api/v1/lists/:id/sections` - List sections with items
- [x] `GET /api/v1/sections/:id` - Get single section
- [x] `POST /api/v1/lists/:id/sections` - Create section
  - Body: `{ name }`
- [x] `PUT /api/v1/sections/:id` - Update section
- [x] `DELETE /api/v1/sections/:id` - Delete section
- [x] `POST /api/v1/sections/reorder` - Reorder sections
  - Body: `{ ids: number[] }`

### Items Endpoints
- [x] `GET /api/v1/sections/:id/items` - List items in section
- [x] `GET /api/v1/items/:id` - Get single item
- [x] `POST /api/v1/sections/:id/items` - Create item
  - Body: `{ name, description?, quantity? }`
- [x] `PUT /api/v1/items/:id` - Update item
  - Body: `{ name?, description?, quantity?, status? }`
  - Status: `active | completed | uncertain`
- [x] `DELETE /api/v1/items/:id` - Delete item
- [x] `POST /api/v1/items/:id/move` - Move item to section
  - Body: `{ targetSectionId }`
- [x] `POST /api/v1/items/reorder` - Reorder items
  - Body: `{ ids: number[] }`

### History Endpoints
- [x] `GET /api/v1/history` - Get item history
  - Query params: `q` (search, min 2 chars), `limit` (default 100)
- [x] `DELETE /api/v1/history/:id` - Delete history entry

### Templates Endpoints
- [x] `GET /api/v1/templates` - List templates with items
- [x] `GET /api/v1/templates/:id` - Get template with items
- [x] `POST /api/v1/templates` - Create template
  - Body: `{ name }`
- [x] `PUT /api/v1/templates/:id` - Update template
  - Body: `{ name }`
- [x] `DELETE /api/v1/templates/:id` - Delete template
- [x] `POST /api/v1/templates/:id/apply` - Apply to list
  - Body: `{ listId, itemIds? }`
- [x] `POST /api/v1/templates/:id/items` - Add item to template
  - Body: `{ name, description?, quantity?, sectionName? }`
- [x] `PUT /api/v1/templates/:templateId/items/:itemId` - Update template item
- [x] `DELETE /api/v1/templates/:templateId/items/:itemId` - Delete template item
- [x] `POST /api/v1/templates/:id/reorder` - Reorder template items
- [x] `POST /api/v1/lists/:id/template` - Create template from list

### Import/Export Endpoints
- [x] `GET /api/v1/export/summary` - Get export summary (lists, templates, history counts)
- [x] `POST /api/v1/export` - Export data
  - Body: `{ listIds?, templateIds?, includeHistory? }`
- [x] `POST /api/v1/import/preview` - Preview import data
- [x] `POST /api/v1/import` - Import data
  - Body: `{ data: ExportData, options: ImportOptions }`

### Suggestions Endpoints
- [x] `GET /api/v1/suggestions` - Search item history for autocomplete
  - Query params: `q`, `limit`
- [x] `GET /api/v1/history/search` - Search history (alias)
  - Query params: `q`, `limit`

### Batch Operations
- [ ] `POST /api/v1/batch` - Execute multiple operations (not implemented)

### Content-Type
- [x] Accept: `application/json`
- [x] Content-Type: `application/json` on responses
- [x] Proper charset (UTF-8)

### Pagination (Optional)
- [ ] Not implemented (data volumes don't warrant it for a personal shopping list app)

### CORS
- [x] Configure CORS for API endpoints
- [x] Allow specific origins or `*` for public APIs
- [x] Authorization header included in allowed headers

## Technical Notes

### Authentication Flow
The `requireAuth` middleware checks auth in this order:
1. If `DISABLE_AUTH=true`, all requests pass through
2. If `Authorization: Bearer <token>` header is present AND `API_TOKEN` is configured:
   - Valid token → request passes
   - Invalid token → 401 immediately (does not fall through to session check)
3. If no Bearer token, fall back to session cookie authentication

### Middleware Stack
1. CORS (`corsHeaders`)
2. Request logger (`requestLogger`)
3. Error handler (`errorHandler`)
4. Security headers (`securityHeaders`)
5. Auth (`requireAuth` on `/api/v1/*` routes) — supports Bearer token + session cookie

### Error Format
```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE"
}
```

Error codes include: `UNAUTHORIZED`, `BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_ERROR`, `INVALID_JSON`

### Environment Variables
- `API_TOKEN` — Optional. If set, enables Bearer token authentication for API endpoints
- `APP_PASSWORD` — Required (unless `DISABLE_AUTH=true`). Password for web login
- `DISABLE_AUTH` — Set to `"true"` to disable all authentication

### Testing
- Bearer token auth: 7 tests in `auth.test.ts` covering valid token, invalid token, fallback to session, both methods simultaneously, case-insensitive scheme
- History endpoints: 6 tests in `index.test.ts` covering GET with limit, GET with q search, DELETE, 404, 400
- Service-level: 2 tests in `items.test.ts` for `deleteHistoryEntry`
- All existing endpoint tests continue to pass (290 total tests)

## Dependencies

- Story 8: Item Management

## Definition of Done

- [x] All CRUD endpoints implemented
- [x] Authentication works with Bearer token
- [x] Consistent response format
- [x] Proper HTTP status codes
- [x] Request validation
- [x] Error handling
- [x] Tests for all endpoints
