# Story 11: Offline Mode

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 4-5 days  
**Dependencies:** Story 10

## Story

As a user, I want to use the app without an internet connection so that I can manage my shopping lists in areas with poor connectivity.

## Acceptance Criteria

### Service Worker
- [ ] Service worker registered on app load
- [ ] Caches static assets (JS, CSS, images)
- [ ] Caches app shell HTML
- [ ] Serves cached assets when offline
- [ ] Updates cache when online
- [ ] Skip waiting for new service worker versions

### Offline Storage
- [ ] Store current list data in IndexedDB or equivalent
- [ ] Store user preferences locally
- [ ] Sync data when connection restored
- [ ] Queue operations while offline
- [ ] Persist queue across browser sessions
- [ ] Clear queue after successful sync

### Operation Queue
While offline, queue these operations:
- [ ] Create item
- [ ] Update item
- [ ] Delete item
- [ ] Move item
- [ ] Create/Update/Delete section
- [ ] Create/Update/Delete list

Queue item format:
```json
{
  "id": "unique-operation-id",
  "type": "create_item",
  "data": { ... },
  "timestamp": "2024-02-11T12:00:00Z"
}
```

### Sync Mechanism
- [ ] Detect when connection restored
- [ ] Show sync in progress indicator
- [ ] Send queued operations to server
- [ ] Apply server updates to local storage
- [ ] Handle conflicts (see Story 10)
- [ ] Retry failed operations with exponential backoff
- [ ] Max retries before showing error
- [ ] Clear queue on successful sync

### Offline UI
- [ ] Offline banner when disconnected
- [ ] Visual indicator for pending operations count
- [ ] Disable features requiring connection:
  - Import/Export
  - Template application (optional)
- [ ] Enable features that work offline:
  - Create/edit/delete items
  - Toggle item status
  - Reorder items
- [ ] Show last sync time when online

### Background Sync (Optional)
- [ ] Use Background Sync API where supported
- [ ] Sync operations even if tab closed
- [ ] Notification on sync completion (optional)

## Technical Notes

### Service Worker Events
```javascript
// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/app.js',
        '/static/styles.css',
        // ... other assets
      ]);
    })
  );
});

// Fetch - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Sync - process queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shopping-list') {
    event.waitUntil(syncQueuedOperations());
  }
});
```

### IndexedDB Schema
```javascript
// Database: fetch-offline
// Store: operations
//   key: operation-id
//   value: { type, data, timestamp }
// Store: lists
//   key: list-id
//   value: { list data with items }
```

### Sync Algorithm
```javascript
async function syncQueuedOperations() {
  const operations = await getQueuedOperations();
  
  for (const op of operations) {
    try {
      await sendToServer(op);
      await removeFromQueue(op.id);
    } catch (error) {
      // Retry with backoff
      op.retryCount = (op.retryCount || 0) + 1;
      if (op.retryCount > MAX_RETRIES) {
        await markAsFailed(op);
      }
      break; // Stop processing queue on error
    }
  }
  
  // Fetch latest state from server
  await refreshLocalData();
}
```

### Conflict Resolution
When sync occurs:
1. Send local operations to server
2. Server applies with timestamps
3. Server broadcasts updates
4. Client receives updates via WebSocket
5. Client updates local IndexedDB

Use "last write wins" based on timestamp.

## Dependencies

- Story 10: Real-Time Synchronization

## Definition of Done

- [ ] App works without internet connection
- [ ] Changes queue while offline
- [ ] Sync occurs when connection restored
- [ ] Offline indicator visible
- [ ] Pending operations count shown
- [ ] No data loss when offline
- [ ] Tests verify offline behavior
