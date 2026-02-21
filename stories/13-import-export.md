# Story 13: Data Import and Export

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 8

## Story

As a user, I want to import and export my data so that I can back up my lists or migrate to a new instance.

## Acceptance Criteria

### Export All Data
- [ ] "Export All" button in settings
- [ ] Generates JSON file with all data:
  - Lists with sections and items
  - Templates
  - History
  - Metadata (export date, app version)
- [ ] Download prompts browser save
- [ ] Filename includes date: `fetch-backup-2024-02-11.json`

### Export Single List
- [ ] "Export" option on each list
- [ ] JSON format (structured)
- [ ] CSV format (flat - rows of items)
- [ ] Include list metadata

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

### CSV Export Format
```csv
list_name,section_name,item_name,description,quantity,status
Grocery Store,Produce,Apples,Red delicious,5,active
Grocery Store,Produce,Bananas,,1 bunch,completed
```

### Import Data
- [ ] "Import" button in settings
- [ ] File picker accepts JSON
- [ ] File size limit (e.g., 10 MB)
- [ ] Validate JSON structure
- [ ] Show preview before applying:
  - Count of lists to import
  - Count of templates
  - Count of history items
  - Conflicts with existing data

### Import Options
- [ ] "Merge" - Add to existing data
- [ ] "Replace" - Clear existing data first
- [ ] Option to select what to import:
  - Lists
  - Templates
  - History

### Import Validation
- [ ] Validate required fields
- [ ] Check for duplicate names (in merge mode)
- [ ] Handle missing optional fields
- [ ] Sanitize input data
- [ ] Transactional import (all or nothing)

### Import Results
- [ ] Show success message with counts
- [ ] Show error message if failed
- [ ] List any items skipped
- [ ] Option to undo (if supported)

### Error Handling
- [ ] Invalid JSON format
- [ ] Missing required fields
- [ ] Unsupported version
- [ ] Corrupted data
- [ ] All errors shown to user

## Technical Notes

### Export Algorithm
```javascript
async function exportAllData() {
  const data = {
    version: APP_VERSION,
    exported_at: new Date().toISOString(),
    lists: await getAllListsWithSectionsAndItems(),
    templates: await getAllTemplates(),
    history: await getAllHistory()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  
  downloadFile(blob, `fetch-backup-${formatDate(new Date())}.json`);
}
```

### Import Algorithm
```javascript
async function importData(file, options) {
  const content = await readFile(file);
  const data = JSON.parse(content);
  
  // Validate
  if (!validateImportData(data)) {
    throw new Error('Invalid import format');
  }
  
  // Preview
  const preview = {
    lists: data.lists.length,
    templates: data.templates?.length || 0,
    history: data.history?.length || 0
  };
  
  if (!confirmImport(preview)) {
    return;
  }
  
  // Import within transaction
  await db.transaction(async (trx) => {
    if (options.mode === 'replace') {
      await clearAllData(trx);
    }
    
    for (const list of data.lists) {
      await importList(trx, list, options);
    }
    
    if (options.importTemplates) {
      for (const template of data.templates || []) {
        await importTemplate(trx, template);
      }
    }
    
    if (options.importHistory) {
      for (const history of data.history || []) {
        await importHistory(trx, history);
      }
    }
  });
}
```

### Version Compatibility
- Check export version on import
- Provide migration path if needed
- Document breaking changes

### API Endpoints
- `GET /export/all` - Export all data
- `GET /export/lists/:id` - Export single list
- `POST /import` - Import data (multipart/form-data)
- `POST /import/preview` - Preview import

## Dependencies

- Story 8: Item Management

## Definition of Done

- [ ] Can export all data as JSON
- [ ] Can export single list as JSON/CSV
- [ ] Can import JSON files
- [ ] Preview shown before import
- [ ] Merge and replace modes work
- [ ] Validation prevents bad imports
- [ ] Tests verify import/export
