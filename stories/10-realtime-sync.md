# Story 10: Real-Time Synchronization

**Priority:** High  
**Phase:** 3 - Advanced Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 8
**Status:** ✅ Complete

## Story

As a user, I want changes to sync in real-time across all my devices so that my family can collaborate on shopping lists simultaneously.

## Acceptance Criteria

### WebSocket/Server-Sent Events Connection
- [x] Real-time endpoint at `/ws` or `/events`
- [x] Connection requires valid session
- [x] Connection established on page load
- [x] Connection status indicator in UI
- [x] Automatic reconnection on disconnect
- [x] Maximum concurrent connections per user (configurable)

### Keepalive Mechanism
- [x] Ping/pong or heartbeat every 30 seconds
- [x] Connection closed after 2 missed heartbeats
- [x] Client attempts reconnection with backoff
- [x] Visual indicator when disconnected

### Broadcast Updates
When any change occurs, broadcast to all connected clients:
- [x] Item created
- [x] Item updated (status, name, etc.)
- [x] Item deleted
- [x] Item moved (between sections or reordered)
- [x] Section created/updated/deleted
- [x] Section reordered
- [x] List created/updated/deleted

### Update Message Format
```json
{
  "type": "item_created|item_updated|item_deleted|...",
  "data": { ...entity data... },
  "timestamp": "2024-02-11T12:00:00Z",
  "client_id": "unique-client-identifier"
}
```

### Client Handling
- [x] Client receives broadcast messages
- [x] Updates local state immediately
- [x] Does not re-fetch from server
- [x] Visual feedback for incoming updates (subtle)
- [ ] Acknowledge receipt to server

### Conflict Resolution
- [x] Last-write-wins for most fields
- [x] Include timestamps in updates
- [x] Client reconciles with server state on reconnect
- [ ] Version numbers on entities (optional but recommended)
- [x] Handle simultaneous edits gracefully

### Connection Management
- [x] Track connected clients server-side
- [x] Broadcast only to clients with access to same lists
- [x] Clean up on disconnect
- [x] Handle browser refresh/reconnect

## Technical Notes

### WebSocket vs Server-Sent Events

**WebSocket (Bidirectional):**
- Better for two-way communication
- Lower latency
- More complex

**Server-Sent Events (Unidirectional):**
- Simpler implementation
- Auto-reconnect built-in
- HTTP-based
- Good for server-to-client updates

Choose based on your stack and needs.

### Connection Flow
```
CLIENT                          SERVER
  |                                |
  |--- CONNECT /ws ---------------->|
  |   (with session cookie)        |
  |<-- CONNECTION ACCEPTED ---------|
  |                                |
  |--- PING (every 30s) ----------->|
  |<-- PONG ------------------------|
  |                                |
  |<-- UPDATE BROADCAST ------------|
  |--- ACK ------------------------>|
  |                                |
  |--- DISCONNECT (or timeout) ---->|
```

### Broadcasting Algorithm
```
ON CHANGE (item/section/list):
  1. Save change to database
  2. Construct update message
  3. Add timestamp
  4. For each connected client:
     a. If client has access to affected list:
        Send update message
  5. Log broadcast (optional)
```

### Client-Side State Management
```javascript
// Pseudo-code
socket.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch(update.type) {
    case 'item_created':
      addItemToUI(update.data);
      break;
    case 'item_updated':
      updateItemInUI(update.data);
      break;
    case 'item_deleted':
      removeItemFromUI(update.data.id);
      break;
    // ... etc
  }
  
  // Acknowledge
  socket.send(JSON.stringify({ack: update.timestamp}));
};
```

## Dependencies

- Story 8: Item Management

## Definition of Done

- [x] Real-time connection established
- [x] All changes broadcast to clients
- [x] Clients update without page refresh
- [x] Reconnection works automatically
- [x] Connection status visible in UI
- [x] Multiple clients see updates simultaneously
- [x] Tests verify sync behavior
