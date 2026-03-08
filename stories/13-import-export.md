# Story 13: Data Import and Export

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 8

## Story

As a user, I want to import and export my data so that I can back up my lists or migrate to a new instance.

## Acceptance Criteria

### Selective Export
- [x] "Export" button in settings opens export modal
- [x] Modal fetches summary of available data (lists, templates, history count)
- [x] Checkboxes for each list (showing icon, name, item count)
- [x] Checkboxes for each template (showing name, item count)
- [x] Toggle for history
- [x] Select all / deselect all for lists and templates
- [x] Export button disabled when nothing selected
- [x] Generates JSON file with selected data
- [x] Download prompts browser save
- [x] Filename includes date: `fetch-backup-2024-02-11.json`

### JSON Export Format
```json
{
  "version": "1.0.0",
  "exported_at": "2024-02-11T12:00:00Z",
  "lists": [
    {
      "name": "Grocery Store",
      "icon": "🛒",
      "sections": [
        {
          "name": "Produce",
          "items": [
            {
              "name": "Apples",
              "description": "Red delicious",
              "quantity": "5",
              "status": "active"
            }
          ]
        }
      ]
    }
  ],
  "templates": [...],
  "history": [...]
}
```

### Import Data
- [x] "Import" button in settings
- [x] File picker accepts JSON
- [x] File size limit (10 MB)
- [x] Validate JSON structure (must have `version`, `exported_at`, `lists` array)
- [x] Show preview before applying:
  - Count of lists to import
  - Count of templates
  - Count of history items
  - Conflicts with existing data

### Import Options
- [x] "Merge" - Add new data, merge sections/items into existing lists by name
- [x] "Replace" - Clear existing data first
- [x] Option to select what to import:
  - Lists
  - Templates
  - History

### Merge Behavior
- [x] Lists with the same name are merged (not skipped or duplicated)
- [x] Existing sections within a merged list receive new items (duplicates skipped by name)
- [x] New sections are added to existing lists
- [x] New lists are created normally
- [x] `listsMerged` counter tracks how many lists were merged vs newly created
- [x] Skipped items reported with context (e.g., `Item "X" in "List > Section" (already exists)`)
- [x] Templates and history skip duplicates by name in merge mode

### Import Validation
- [x] Validate required fields
- [x] Check for duplicate names (in merge mode)
- [x] Handle missing optional fields
- [x] Sanitize input data (trim strings, enforce max lengths)
- [x] Validate item status values (active, completed, uncertain); default to active
- [x] Transactional import (all or nothing)

### Import Results
- [x] Show success message with counts (imported, merged, skipped)
- [x] Show error message if failed
- [x] List any items skipped
- [ ] Option to undo (not implemented)

### Error Handling
- [x] Invalid JSON format
- [x] Missing required fields
- [x] Unsupported version
- [x] Corrupted data
- [x] All errors shown to user via toast or modal

## Technical Notes

### API Endpoints
- `GET /api/v1/export/summary` - Returns lists (id, name, icon, itemCount), templates (id, name, itemCount), historyCount
- `POST /api/v1/export` - Accepts `{ listIds?: number[], templateIds?: number[], includeHistory: boolean }`, returns ExportData JSON
- `POST /api/v1/import/preview` - Accepts ExportData, returns preview with counts and conflicts
- `POST /api/v1/import` - Accepts `{ data: ExportData, options: ImportOptions }`, returns ImportResult

### Shared Types
- `ExportOptions` - `{ listIds?: number[], templateIds?: number[], includeHistory: boolean }`
- `ExportSummary` - `{ lists: Array<{id, name, icon, itemCount}>, templates: Array<{id, name, itemCount}>, historyCount }`
- `ImportPreview` - `{ listCount, templateCount, historyCount, existingListConflicts, existingTemplateConflicts }`
- `ImportOptions` - `{ mode: "merge" | "replace", importLists, importTemplates, importHistory }`
- `ImportResult` - `{ listsImported, listsMerged, templatesImported, historyImported, skipped }`

### Export Selection Logic
- `listIds` undefined = export all lists; empty array `[]` = export no lists; array of IDs = export selected
- Same pattern for `templateIds`
- `includeHistory` boolean controls history inclusion

### Import Merge Logic
```
For each list in import data:
  If list name exists in DB (case-insensitive):
    For each section in import list:
      If section name exists in DB list:
        Add only new items (skip duplicates by name)
      Else:
        Create new section with all items
    Track as "merged" if any changes made
  Else:
    Create new list with all sections and items
    Track as "imported"
```

### Version Compatibility
- Supported versions: `["1.0.0"]`
- Version checked on import; unsupported versions rejected with error

## Dependencies

- Story 8: Item Management

## Definition of Done

- [x] Can export selected data as JSON via export modal
- [x] Can import JSON files
- [x] Preview shown before import
- [x] Merge mode merges into existing lists (not skip)
- [x] Replace mode clears and reimports
- [x] Validation prevents bad imports
- [x] Tests verify import/export (unit + integration)
