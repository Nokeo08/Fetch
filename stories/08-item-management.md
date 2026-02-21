# Story 8: Item Management

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 7

## Story

As a user, I want to add, edit, and manage items on my shopping list so that I can track what I need to buy.

## Acceptance Criteria

### Create Item
- [ ] Add item form in list view
- [ ] Name field required (1-200 characters)
- [ ] Optional description field
- [ ] Optional quantity field (free text or structured)
- [ ] Section assignment (dropdown or auto-suggest)
- [ ] Quick-add from suggestions
- [ ] Success notification
- [ ] Item appears in correct section

### Display Items
- [ ] Items grouped by section
- [ ] Each item shows:
  - Name (primary)
  - Description (secondary, smaller)
  - Quantity (if provided)
  - Status indicator
- [ ] Completed items visually distinct (strikethrough)
- [ ] Uncertain items have special indicator
- [ ] Empty state for sections

### Edit Item
- [ ] Inline editing or modal
- [ ] Can edit all fields
- [ ] Cancel without saving
- [ ] Success notification
- [ ] Updates display immediately

### Delete Item
- [ ] Delete button per item
- [ ] Confirmation dialog
- [ ] Soft delete (keep in history)
- [ ] Success notification

### Toggle Item Status
- [ ] Checkbox or tap to toggle completed
- [ ] Visual change immediate (strikethrough)
- [ ] Completed items move to bottom of section
- [ ] Can toggle back to active

### Item States
**Active:**
- [ ] Default state
- [ ] Full opacity
- [ ] Can be edited/deleted

**Completed:**
- [ ] Strikethrough text
- [ ] Reduced opacity
- [ ] Moved to bottom of section
- [ ] Toggle restores to active

**Uncertain:**
- [ ] Question mark icon or yellow highlight
- [ ] Normal opacity
- [ ] Can be marked complete or active
- [ ] Different from completed visually

### Batch Operations
- [ ] "Clear completed" button per section
- [ ] Confirmation before clearing
- [ ] Deletes or archives all completed items
- [ ] Success notification with count

### Reorder Items
- [ ] Drag-and-drop within section
- [ ] Visual feedback during drag
- [ ] Order persisted
- [ ] Works on mobile

## Technical Notes

### Database Schema
```sql
CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    status TEXT DEFAULT 'active', -- active, completed, uncertain
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Status Values
- `active` - Default, item needs to be purchased
- `completed` - Item purchased
- `uncertain` - Can't find item, need help

### Validation
- Name: 1-200 characters, required
- section_id: Must reference valid section
- status: One of allowed values

### Ordering Logic
```sql
SELECT * FROM items 
WHERE section_id = :id 
ORDER BY 
  CASE status 
    WHEN 'completed' THEN 1 
    ELSE 0 
  END,
  sort_order,
  created_at DESC
```

### API Endpoints
- `GET /sections/:id/items` - List items
- `POST /sections/:id/items` - Create item
- `GET /items/:id` - Get item
- `PUT /items/:id` - Update item
- `DELETE /items/:id` - Delete item
- `POST /items/:id/toggle` - Toggle status
- `POST /items/:id/move` - Move to section
- `POST /sections/:id/clear-completed` - Batch delete
- `POST /items/reorder` - Reorder items

## Dependencies

- Story 7: Section Management

## Definition of Done

- [ ] Can create, edit, delete items
- [ ] All three status states work
- [ ] Visual indicators for each state
- [ ] Reordering within section works
- [ ] Batch clear completed works
- [ ] Move between sections works
- [ ] Tests cover all operations
