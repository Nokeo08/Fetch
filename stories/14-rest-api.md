# Story 14: REST API

**Priority:** Medium  
**Phase:** 4 - Polish & API  
**Estimate:** 3-4 days  
**Dependencies:** Story 8

## Story

As a developer, I want a REST API so that I can integrate Fetch with other applications and automate workflows.

## Acceptance Criteria

### API Authentication
- [ ] API token configurable via `API_TOKEN` environment variable
- [ ] Token passed in `Authorization: Bearer <token>` header
- [ ] Returns 401 for missing/invalid token
- [ ] Separate from session-based web auth
- [ ] Can use both auth methods simultaneously

### API Versioning
- [ ] Base URL: `/api/v1`
- [ ] Version in URL path
- [ ] Documentation specifies version

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
- [ ] 200 - Success (GET, PUT)
- [ ] 201 - Created (POST)
- [ ] 204 - No Content (DELETE)
- [ ] 400 - Bad Request (validation error)
- [ ] 401 - Unauthorized (invalid token)
- [ ] 404 - Not Found
- [ ] 429 - Too Many Requests (rate limit)
- [ ] 500 - Internal Server Error

### Lists Endpoints
- [ ] `GET /api/v1/lists` - List all lists
  - Response: Array of lists with item counts
  
- [ ] `GET /api/v1/lists/:id` - Get single list
  - Response: List with sections and items
  
- [ ] `POST /api/v1/lists` - Create list
  - Body: `{ name, icon }`
  - Response: Created list
  
- [ ] `PUT /api/v1/lists/:id` - Update list
  - Body: `{ name, icon, is_active }`
  - Response: Updated list
  
- [ ] `DELETE /api/v1/lists/:id` - Delete list
  - Response: 204 No Content
  
- [ ] `POST /api/v1/lists/:id/reorder` - Reorder lists
  - Body: `{ sort_order }`

### Sections Endpoints
- [ ] `GET /api/v1/lists/:id/sections` - List sections
- [ ] `GET /api/v1/sections/:id` - Get single section
- [ ] `POST /api/v1/lists/:id/sections` - Create section
  - Body: `{ name, color }`
- [ ] `PUT /api/v1/sections/:id` - Update section
- [ ] `DELETE /api/v1/sections/:id` - Delete section
- [ ] `POST /api/v1/sections/:id/reorder` - Reorder sections

### Items Endpoints
- [ ] `GET /api/v1/sections/:id/items` - List items in section
- [ ] `GET /api/v1/items/:id` - Get single item
- [ ] `POST /api/v1/sections/:id/items` - Create item
  - Body: `{ name, description, quantity, status }`
- [ ] `PUT /api/v1/items/:id` - Update item
- [ ] `DELETE /api/v1/items/:id` - Delete item
- [ ] `POST /api/v1/items/:id/move` - Move item to section
  - Body: `{ section_id }`
- [ ] `POST /api/v1/items/:id/reorder` - Reorder items

### History Endpoints
- [ ] `GET /api/v1/history` - Get item history
  - Query params: `q` (search), `limit`
- [ ] `DELETE /api/v1/history/:id` - Delete history entry

### Templates Endpoints
- [ ] `GET /api/v1/templates` - List templates
- [ ] `GET /api/v1/templates/:id` - Get template
- [ ] `POST /api/v1/templates` - Create template
- [ ] `PUT /api/v1/templates/:id` - Update template
- [ ] `DELETE /api/v1/templates/:id` - Delete template
- [ ] `POST /api/v1/templates/:id/apply` - Apply to list
  - Body: `{ list_id }`

### Batch Operations
- [ ] `POST /api/v1/batch` - Execute multiple operations
  - Body: Array of operations
  - Atomic (all succeed or all fail)
  - Example:
    ```json
    {
      "operations": [
        { "method": "POST", "path": "/sections", "body": {...} },
        { "method": "POST", "path": "/items", "body": {...} }
      ]
    }
    ```

### Content-Type
- [ ] Accept: `application/json`
- [ ] Content-Type: `application/json` on responses
- [ ] Proper charset (UTF-8)

### Pagination (Optional)
- [ ] `GET /api/v1/lists?page=1&limit=20`
- [ ] Response includes pagination metadata:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
  ```

### CORS (if needed)
- [ ] Configure CORS for API endpoints
- [ ] Allow specific origins or `*` for public APIs

## Technical Notes

### Middleware Stack for API
1. CORS (if enabled)
2. API authentication
3. Request parsing (JSON)
4. Rate limiting (optional)
5. Logging

### Error Handling
```javascript
function apiError(res, status, message, code) {
  res.status(status).json({
    success: false,
    error: message,
    code: code
  });
}

// Usage
apiError(res, 404, 'List not found', 'LIST_NOT_FOUND');
```

### Validation
- Validate request body schemas
- Return 400 with field-level errors:
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "fields": {
      "name": "Name is required"
    }
  }
  ```

### Testing
- Test each endpoint
- Test authentication
- Test error cases
- Test batch operations

## Dependencies

- Story 8: Item Management

## Definition of Done

- [ ] All CRUD endpoints implemented
- [ ] Authentication works with Bearer token
- [ ] Consistent response format
- [ ] Proper HTTP status codes
- [ ] Request validation
- [ ] Error handling
- [ ] API documentation
- [ ] Tests for all endpoints
