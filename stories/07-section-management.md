# Story 7: Section Management

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 6
**Status:** ✅ Complete

## Story

As a user, I want to organize my shopping list into sections so that I can navigate the store efficiently.

## Acceptance Criteria

### Create Section
- [x] Add section button in list view
- [x] Form with name field
- [x] Name required (1-100 characters)
- [x] Section added to list
- [x] Success notification

### List Sections
- [x] Sections displayed in order within list
- [x] Each section shows:
  - Name
  - Item count
  - Expand/collapse toggle
- [x] Empty state for sections without items
- [x] Visual separation between sections

### Edit Section
- [x] Modal edit form
- [x] Can change name
- [x] Cancel option
- [x] Success notification

### Delete Section
- [x] Delete button with confirmation
- [x] If section has items:
  - Show item count in warning
- [x] Success notification

### Reorder Sections
- [x] Drag-and-drop within list
- [x] Visual feedback during drag
- [x] Order persisted to database
- [x] Works on mobile devices

### Collapse/Expand Sections
- [x] Toggle button on each section
- [x] Collapsed state hides items
- [x] State persists during session
- [x] Visual indicator of collapsed state

## Technical Notes

### Database Schema
```sql
CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Validation
- Name: 1-100 characters, required
- list_id: Must reference valid list

### Cascade Behavior
```sql
ON DELETE CASCADE on list_id
```
When list is deleted, all sections are automatically deleted.

### API Endpoints
- `GET /lists/:id/sections` - List sections ✅
- `POST /lists/:id/sections` - Create section ✅
- `GET /sections/:id` - Get section ✅
- `PUT /sections/:id` - Update section ✅
- `DELETE /sections/:id` - Delete section ✅
- `POST /sections/reorder` - Reorder sections ✅

## Dependencies

- Story 6: Shopping List CRUD ✅

## Definition of Done

- [x] Can create, edit, delete sections
- [x] Sections ordered within list
- [x] Reordering works
- [x] Collapse/expand works
- [x] Tests cover all operations

## Implementation

### Backend
- `server/src/services/sections.ts` - Sections service with CRUD operations
- `server/src/index.ts` - API endpoints for sections
- Tests: 182 passing

### Frontend
- `client/src/api/sections.ts` - API client for sections and items
- `client/src/ListDetail.tsx` - List detail page with sections
- `client/src/ListDetail.css` - Styles for list detail and sections
- `client/src/Lists.tsx` - Updated to navigate to list detail on click
- `client/src/main.tsx` - Added route for list detail
