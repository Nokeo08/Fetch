# Story 6: Shopping List CRUD

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 4
**Status:** ✅ Complete

## Story

As a user, I want to create and manage multiple shopping lists so that I can organize my shopping by store or occasion.

## Acceptance Criteria

### Create List
- [x] Form to create new list with name field
- [x] Optional emoji/icon selection
- [x] Name required (1-100 characters)
- [x] Validation error for invalid input
- [x] New list becomes active automatically
- [x] Success notification shown

### List All Lists
- [x] Page/section displaying all lists
- [x] Each list shows:
  - Name and icon
  - Item count (active/total)
  - Created date
  - Active status indicator
- [x] Empty state when no lists
- [x] Responsive grid layout

### View Single List
- [x] Detail view for each list (via cards)
- [x] Shows list name, icon, metadata
- [x] Displays sections and items
- [x] Edit and delete options
- [x] Back navigation to lists overview

### Edit List
- [x] Edit form pre-populated with current data
- [x] Can change name and icon
- [x] Validation same as create
- [x] Cancel option returns to view
- [x] Success notification

### Delete List
- [x] Delete button with confirmation dialog
- [x] Cannot delete last remaining list
- [x] Warning shown if list has items
- [x] Success notification
- [x] Redirect to lists overview

### Reorder Lists
- [x] Drag-and-drop to reorder lists
- [x] Visual feedback during drag
- [x] Order persisted to database
- [x] Works on touch devices

### Set Active List
- [x] Click/tap to set list as active
- [x] Active list highlighted visually
- [x] Only one active at a time
- [x] Active status persists across sessions
- [x] Quick access to active list from navigation

## Technical Notes

### Database Schema
```sql
CREATE TABLE lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Validation Rules
- Name: 1-100 characters, required
- Icon: Optional, default to '📋'

### Active List Logic
```
ON SET ACTIVE:
  1. UPDATE lists SET is_active = 0 WHERE is_active = 1
  2. UPDATE lists SET is_active = 1 WHERE id = :list_id
  3. Return success
```

### API Endpoints
- `GET /lists` - List all ✅
- `POST /lists` - Create ✅
- `GET /lists/:id` - Get one ✅
- `PUT /lists/:id` - Update ✅
- `DELETE /lists/:id` - Delete ✅
- `POST /lists/:id/activate` - Set active ✅
- `POST /lists/reorder` - Reorder ✅

## Dependencies

- Story 4: Session-Based Authentication ✅

## Definition of Done

- [x] Can create, view, edit, delete lists
- [x] Cannot delete last list
- [x] Reordering works and persists
- [x] Active list selection works
- [x] All validation in place
- [x] UI is responsive
- [x] Tests cover all CRUD operations

## Implementation

### Backend
- `server/src/services/lists.ts` - Lists service with CRUD operations
- `server/src/index.ts` - API endpoints for lists
- Tests: 182 passing

### Frontend
- `client/src/api/lists.ts` - API client for lists
- `client/src/Lists.tsx` - Lists page with full CRUD UI
- `client/src/Lists.css` - Styles for lists page
- `client/src/App.tsx` - Updated to show lists page with header
