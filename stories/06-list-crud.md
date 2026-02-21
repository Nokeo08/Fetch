# Story 6: Shopping List CRUD

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 4

## Story

As a user, I want to create and manage multiple shopping lists so that I can organize my shopping by store or occasion.

## Acceptance Criteria

### Create List
- [ ] Form to create new list with name field
- [ ] Optional emoji/icon selection
- [ ] Name required (1-100 characters)
- [ ] Validation error for invalid input
- [ ] New list becomes active automatically
- [ ] Success notification shown

### List All Lists
- [ ] Page/section displaying all lists
- [ ] Each list shows:
  - Name and icon
  - Item count (active/total)
  - Created date
  - Active status indicator
- [ ] Empty state when no lists
- [ ] Responsive grid or list layout

### View Single List
- [ ] Detail view for each list
- [ ] Shows list name, icon, metadata
- [ ] Displays sections and items
- [ ] Edit and delete options
- [ ] Back navigation to lists overview

### Edit List
- [ ] Edit form pre-populated with current data
- [ ] Can change name and icon
- [ ] Validation same as create
- [ ] Cancel option returns to view
- [ ] Success notification

### Delete List
- [ ] Delete button with confirmation dialog
- [ ] Cannot delete last remaining list
- [ ] Warning shown if list has items
- [ ] Option to export before delete
- [ ] Success notification
- [ ] Redirect to lists overview

### Reorder Lists
- [ ] Drag-and-drop to reorder lists
- [ ] Visual feedback during drag
- [ ] Order persisted to database
- [ ] Works on touch devices

### Set Active List
- [ ] Click/tap to set list as active
- [ ] Active list highlighted visually
- [ ] Only one active at a time
- [ ] Active status persists across sessions
- [ ] Quick access to active list from navigation

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
- `GET /lists` - List all
- `POST /lists` - Create
- `GET /lists/:id` - Get one
- `PUT /lists/:id` - Update
- `DELETE /lists/:id` - Delete
- `POST /lists/:id/activate` - Set active
- `POST /lists/reorder` - Reorder

## Dependencies

- Story 4: Session-Based Authentication

## Definition of Done

- [ ] Can create, view, edit, delete lists
- [ ] Cannot delete last list
- [ ] Reordering works and persists
- [ ] Active list selection works
- [ ] All validation in place
- [ ] UI is responsive
- [ ] Tests cover all CRUD operations
