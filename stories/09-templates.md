# Story 9: Template System

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 8

## Story

As a user, I want to create and use templates for common shopping patterns so that I can quickly populate my lists with frequently bought items.

## Acceptance Criteria

### Create Template from Scratch
- [ ] Templates page/listing
- [ ] "Create Template" button
- [ ] Form with name field (required, 1-100 characters)
- [ ] Add items to template (name, description, quantity, section)
- [ ] Reorder items in template
- [ ] Save template

### Create Template from List
- [ ] "Save as Template" option on lists
- [ ] Pre-populated with list items
- [ ] Can edit before saving
- [ ] Option to include only certain sections

### List Templates
- [ ] Template gallery/listing page
- [ ] Each template shows:
  - Name
  - Item count
  - Preview of items
  - Created date
- [ ] Empty state when no templates

### Edit Template
- [ ] Edit name
- [ ] Add/remove items
- [ ] Edit item details
- [ ] Reorder items
- [ ] Save changes

### Delete Template
- [ ] Delete with confirmation
- [ ] No impact on existing lists
- [ ] Success notification

### Apply Template to List
- [ ] "Apply Template" button on list view
- [ ] Template selector (dropdown or grid)
- [ ] Preview items to be added
- [ ] Option to select which items to add
- [ ] Skip items already in list (by name match)
- [ ] Preserve section assignments if section exists
- [ ] Create new sections if needed
- [ ] Show success message with count added

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
     a. Check if item name exists in list
     b. If exists: skip
     c. If not exists:
        - Find or create section with section_name
        - Create item in that section
        - Copy name, description, quantity
  3. Return count of items added
```

### Duplicate Detection
- Match by item name (case-insensitive)
- Optional: fuzzy matching
- Show skipped items in result

### API Endpoints
- `GET /templates` - List templates
- `POST /templates` - Create template
- `GET /templates/:id` - Get template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/apply` - Apply to list
- `POST /lists/:id/template` - Create template from list

## Dependencies

- Story 8: Item Management

## Definition of Done

- [ ] Can create templates from scratch
- [ ] Can create from existing list
- [ ] Can edit and delete templates
- [ ] Apply template with preview
- [ ] Duplicates skipped correctly
- [ ] Sections created as needed
- [ ] Tests cover template operations
