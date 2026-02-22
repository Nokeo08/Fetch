# Story 8: Item Management

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 7

## Story

As a user, I want to add, edit, and manage items on my shopping list so that I can track what I need to buy.

## Acceptance Criteria

### Create Item
- [x] Add item form in list view
- [x] Name field required (1-200 characters)
- [x] Optional description field
- [x] Optional quantity field (free text or structured)
- [x] Section assignment (via edit modal dropdown)
- [x] Success notification
- [x] Item appears in correct section

### Display Items
- [x] Items grouped by section
- [x] Each item shows:
  - Name (primary)
  - Description (secondary, smaller, below name)
  - Quantity (inline with name)
  - Status indicator (checkbox)
- [x] Completed items visually distinct (strikethrough)
- [x] Uncertain items have special indicator (yellow background)
- [x] Empty state for sections

### Edit Item
- [x] Modal for editing
- [x] Can edit all fields (name, description, quantity, section)
- [x] Cancel without saving
- [x] Success notification
- [x] Updates display immediately

### Delete Item
- [x] Delete button per item
- [x] Confirmation dialog
- [x] Success notification
- [x] Item removed from list

### Toggle Item Status
- [x] Checkbox to toggle completed
- [x] Click anywhere on item row to toggle completed
- [x] Visual change immediate (strikethrough)
- [x] Completed items move to collapsible "Completed" section at bottom
- [x] Can toggle back to active
- [x] Completed section defaults to collapsed

### Item States
**Active:**
- [x] Default state
- [x] Full opacity
- [x] Can be edited/deleted
- [x] Can be marked uncertain via "?" button

**Completed:**
- [x] Strikethrough text
- [x] Reduced opacity
- [x] Moved to collapsible "Completed" section
- [x] Toggle restores to active

**Uncertain:**
- [x] Yellow/gold background highlight
- [x] Normal opacity
- [x] "?" button toggles between uncertain and active
- [x] Different from completed visually

### Batch Operations
- [x] "Clear" button per section (appears when section has completed items)
- [x] Confirmation before clearing
- [x] Deletes all completed items
- [x] Success notification with count

### Reorder Items
- [x] Drag-and-drop within section
- [x] Visual feedback during drag
- [x] Order persisted
- [x] Works on mobile

### Move Between Sections
- [x] Section dropdown in edit modal
- [x] Item moves to new section immediately
- [x] Success notification

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
- `POST /items/:id/move` - Move to section
- `POST /items/reorder` - Reorder items

## Dependencies

- Story 7: Section Management

## Definition of Done

- [x] Can create, edit, delete items
- [x] All three status states work
- [x] Visual indicators for each state
- [x] Reordering within section works
- [x] Batch clear completed works
- [x] Move between sections works
- [x] Tests cover all operations (158 tests passing)
