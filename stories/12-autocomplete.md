# Story 12: Auto-Completion and Suggestions

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 8

## Story

As a user, I want the app to suggest items I've added before so that I can quickly add common items without typing full names.

## Acceptance Criteria

### Item History Tracking
- [ ] Every unique item name stored in history table
- [ ] Track frequency (how many times added)
- [ ] Remember last section used for item
- [ ] Remember last description and quantity
- [ ] Update last_used timestamp on each add
- [ ] History persists across sessions

### Fuzzy Search
- [ ] Search activates when typing in item name field
- [ ] Minimum 2 characters to trigger search
- [ ] Fuzzy matching algorithm (Jaro, Levenshtein, etc.)
- [ ] Character normalization (special chars to ASCII)
- [ ] Case-insensitive matching
- [ ] Results ranked by:
  - Frequency of use
  - Recency of use
  - Match quality

### Suggestion Display
- [ ] Dropdown below input field
- [ ] Show top 5 matches maximum
- [ ] Each suggestion shows:
  - Item name (bold matching parts)
  - Last used section
  - Frequency indicator (optional)
- [ ] Click to select suggestion
- [ ] Keyboard navigation (up/down arrows, enter to select, escape to close)

### Auto-Fill on Selection
- [ ] Selecting suggestion fills:
  - Item name
  - Section (if exists in current list)
  - Description (optional)
  - Quantity (optional)
- [ ] User can edit auto-filled values
- [ ] Cursor positioned at end of name

### Debouncing
- [ ] Search query debounced (300ms)
- [ ] Cancel in-flight requests on new input
- [ ] Loading indicator while searching

### Edge Cases
- [ ] No suggestions when input matches exactly
- [ ] Empty state when no matches
- [ ] Handle special characters in search
- [ ] Mobile-friendly touch targets

## Technical Notes

### Database Schema
```sql
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    section_name TEXT,
    description TEXT,
    quantity TEXT,
    frequency INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fuzzy Matching Algorithms

**Jaro Similarity:**
- Good for short strings
- Handles transpositions well
- Range: 0.0 to 1.0

**Levenshtein Distance:**
- Edit distance metric
- Number of insertions, deletions, substitutions
- Lower is better match

**Implementation Options:**
- Use existing library for your language
- Or implement Jaro-Winkler:

```javascript
function jaroSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  return ((matches / len1) + (matches / len2) + ((matches - transpositions / 2) / matches)) / 3;
}
```

### Character Normalization
```javascript
function normalizeChars(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Example: "café" → "cafe", "żółty" → "zolty"
```

### API Endpoint
- `GET /suggestions?q={query}` - Search history

Response:
```json
{
  "suggestions": [
    {
      "name": "Milk",
      "section_name": "Dairy",
      "frequency": 15,
      "last_used": "2024-02-10T12:00:00Z"
    }
  ]
}
```

### Search Query
```sql
SELECT * FROM history 
WHERE name LIKE '%' || :query || '%' 
   OR similarity(name, :query) > 0.6
ORDER BY 
  frequency DESC,
  last_used DESC
LIMIT 5;
```

## Dependencies

- Story 8: Item Management

## Definition of Done

- [ ] History tracked for all items
- [ ] Fuzzy search works
- [ ] Top 5 suggestions displayed
- [ ] Keyboard navigation works
- [ ] Auto-fill populates fields
- [ ] Special characters normalized
- [ ] Tests verify suggestion logic
