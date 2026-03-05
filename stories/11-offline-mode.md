# Story 11: Offline Mode

**Priority:** Medium  
**Phase:** 3 - Advanced Features  
**Estimate:** 4-5 days  
**Dependencies:** Story 10
**Status:** ✅ Complete

## Story

As a user, I want to use the app without an internet connection so that I can manage my shopping lists in areas with poor connectivity.

## Acceptance Criteria

### Service Worker
- [x] Service worker registered on app load
- [x] Caches static assets (JS, CSS, images)
- [x] Caches app shell HTML
- [x] Serves cached assets when offline
- [x] Updates cache when online
- [x] Skip waiting for new service worker versions

### Offline Storage
- [x] Store current list data in IndexedDB or equivalent
- [x] Store user preferences locally
- [x] Sync data when connection restored
- [x] Queue operations while offline
- [x] Persist queue across browser sessions
- [x] Clear queue after successful sync

### Operation Queue
While offline, queue these operations:
- [x] Create item
- [x] Update item
- [x] Delete item
- [x] Move item
- [x] Create/Update/Delete section
- [x] Create/Update/Delete list

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
- [x] Detect when connection restored
- [x] Show sync in progress indicator
- [x] Send queued operations to server
- [x] Apply server updates to local storage
- [x] Handle conflicts (see Story 10)
- [x] Retry failed operations with exponential backoff
- [x] Max retries before showing error
- [x] Clear queue on successful sync

### Offline UI
- [x] Offline banner when disconnected
- [x] Visual indicator for pending operations count
- [ ] Disable features requiring connection:
  - Import/Export
  - Template application (optional)
- [x] Enable features that work offline:
  - Create/edit/delete items
  - Toggle item status
  - Reorder items
- [x] Show last sync time when online

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

- [x] App works without internet connection
- [x] Changes queue while offline
- [x] Sync occurs when connection restored
- [x] Offline indicator visible
- [x] Pending operations count shown
- [x] No data loss when offline
- [x] Tests verify offline behavior
