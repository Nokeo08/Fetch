# Story 10: Real-Time Synchronization

**Priority:** High  
**Phase:** 3 - Advanced Features  
**Estimate:** 3-4 days  
**Dependencies:** Story 8

## Story

As a user, I want changes to sync in real-time across all my devices so that my family can collaborate on shopping lists simultaneously.

## Acceptance Criteria

### WebSocket/Server-Sent Events Connection
- [ ] Real-time endpoint at `/ws` or `/events`
- [ ] Connection requires valid session
- [ ] Connection established on page load
- [ ] Connection status indicator in UI
- [ ] Automatic reconnection on disconnect
- [ ] Maximum concurrent connections per user (configurable)

### Keepalive Mechanism
- [ ] Ping/pong or heartbeat every 30 seconds
- [ ] Connection closed after 2 missed heartbeats
- [ ] Client attempts reconnection with backoff
- [ ] Visual indicator when disconnected

### Broadcast Updates
When any change occurs, broadcast to all connected clients:
- [ ] Item created
- [ ] Item updated (status, name, etc.)
- [ ] Item deleted
- [ ] Item moved (between sections or reordered)
- [ ] Section created/updated/deleted
- [ ] Section reordered
- [ ] List created/updated/deleted

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
- [ ] Client receives broadcast messages
- [ ] Updates local state immediately
- [ ] Does not re-fetch from server
- [ ] Visual feedback for incoming updates (subtle)
- [ ] Acknowledge receipt to server

### Conflict Resolution
- [ ] Last-write-wins for most fields
- [ ] Include timestamps in updates
- [ ] Client reconciles with server state on reconnect
- [ ] Version numbers on entities (optional but recommended)
- [ ] Handle simultaneous edits gracefully

### Connection Management
- [ ] Track connected clients server-side
- [ ] Broadcast only to clients with access to same lists
- [ ] Clean up on disconnect
- [ ] Handle browser refresh/reconnect

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

- [ ] Real-time connection established
- [ ] All changes broadcast to clients
- [ ] Clients update without page refresh
- [ ] Reconnection works automatically
- [ ] Connection status visible in UI
- [ ] Multiple clients see updates simultaneously
- [ ] Tests verify sync behavior
