# Story 7: Section Management

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 6

## Story

As a user, I want to organize my shopping list into sections so that I can navigate the store efficiently.

## Acceptance Criteria

### Create Section
- [ ] Add section button in list view
- [ ] Form with name field
- [ ] Name required (1-100 characters)
- [ ] Optional color/icon selection
- [ ] Section added to list
- [ ] Success notification

### List Sections
- [ ] Sections displayed in order within list
- [ ] Each section shows:
  - Name and optional icon/color
  - Item count
  - Expand/collapse toggle
- [ ] Empty state for sections without items
- [ ] Visual separation between sections

### Edit Section
- [ ] Inline or modal edit form
- [ ] Can change name
- [ ] Can change color/icon
- [ ] Cancel option
- [ ] Success notification

### Delete Section
- [ ] Delete button with confirmation
- [ ] If section has items:
  - Option to move items to another section
  - Option to delete items
  - Show item count in warning
- [ ] If section empty:
  - Immediate deletion
- [ ] Success notification

### Reorder Sections
- [ ] Drag-and-drop within list
- [ ] Visual feedback during drag
- [ ] Order persisted to database
- [ ] Works on mobile devices

### Move Items Between Sections
- [ ] Drag items between sections
- [ ] Or dropdown to select section
- [ ] Item appears in new section immediately
- [ ] Order preserved or added at end

### Collapse/Expand Sections
- [ ] Toggle button on each section
- [ ] Collapsed state hides items
- [ ] State persists during session
- [ ] Visual indicator of collapsed state

## Technical Notes

### Database Schema
```sql
CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT, -- optional hex color
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
- `GET /lists/:id/sections` - List sections
- `POST /lists/:id/sections` - Create section
- `GET /sections/:id` - Get section
- `PUT /sections/:id` - Update section
- `DELETE /sections/:id` - Delete section
- `POST /sections/reorder` - Reorder sections

## Dependencies

- Story 6: Shopping List CRUD

## Definition of Done

- [ ] Can create, edit, delete sections
- [ ] Sections ordered within list
- [ ] Reordering works
- [ ] Items can move between sections
- [ ] Delete with items shows options
- [ ] Collapse/expand works
- [ ] Tests cover all operations
