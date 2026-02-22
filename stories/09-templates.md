# Story 9: Template System

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 8

## Story

As a user, I want to create and use templates for common shopping patterns so that I can quickly populate my lists with frequently bought items.

## Acceptance Criteria

### Create Template from Scratch
- [x] Templates page/listing
- [x] "Create Template" button
- [x] Form with name field (required, 1-100 characters)
- [x] Add items to template (name, description, quantity, section)
- [x] Reorder items in template
- [x] Save template

### Create Template from List
- [x] "Save as Template" option on lists
- [x] Pre-populated with list items
- [x] Can edit name before saving
- [x] All sections included

### List Templates
- [x] Template gallery/listing page
- [x] Each template shows:
  - Name
  - Item count
  - Preview of items (first 3)
  - Created date
- [x] Empty state when no templates
- [x] Navigation from main header

### Edit Template
- [x] Edit name
- [x] Add/remove items
- [x] Edit item details (name, description, quantity, section)
- [x] Reorder items (drag-and-drop)
- [x] Save changes immediately

### Delete Template
- [x] Delete with confirmation
- [x] No impact on existing lists
- [x] Success notification

### Apply Template to List
- [x] "Apply Template" button on list view
- [x] Template selector (list of templates)
- [x] Preview items to be added
- [x] Option to select which items to add (checkboxes)
- [x] Skip items already in list (by name match, case-insensitive)
- [x] Preserve section assignments if section exists
- [x] Create new sections if needed
- [x] Show success message with count added (and count skipped)

## Technical Notes

### Database Schema
```sql
-- Templates
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template Items
CREATE TABLE template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    section_name TEXT, -- Store section name for reference
    sort_order INTEGER DEFAULT 0
);
```

### Apply Template Algorithm
```
APPLY TEMPLATE to LIST:
  1. Get all items in target list (for duplicate check)
  2. For each template item selected:
     a. Check if item name exists in list (case-insensitive)
     b. If exists: skip
     c. If not exists:
        - Find or create section with section_name
        - Create item in that section
        - Copy name, description, quantity
  3. Return count of items added and skipped
```

### Duplicate Detection
- Match by item name (case-insensitive)
- Show skipped items in result message

### API Endpoints
- `GET /api/v1/templates` - List templates with items
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/:id` - Get template with items
- `PUT /api/v1/templates/:id` - Update template name
- `DELETE /api/v1/templates/:id` - Delete template
- `POST /api/v1/templates/:id/items` - Add item to template
- `PUT /api/v1/templates/:templateId/items/:itemId` - Update template item
- `DELETE /api/v1/templates/:templateId/items/:itemId` - Delete template item
- `POST /api/v1/templates/:id/reorder` - Reorder template items
- `POST /api/v1/templates/:id/apply` - Apply to list
- `POST /api/v1/lists/:id/template` - Create template from list

## Dependencies

- Story 8: Item Management

## Definition of Done

- [x] Can create templates from scratch
- [x] Can create from existing list
- [x] Can edit and delete templates
- [x] Apply template with preview and item selection
- [x] Duplicates skipped correctly
- [x] Sections created as needed
- [x] Tests cover template operations (158 tests passing)
