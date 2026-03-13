# Offline Mode

Fetch is designed to work reliably without an internet connection.

## How It Works

Fetch is a Progressive Web App (PWA) that uses:

- **Service Worker** -- Caches the application shell so it loads without a network connection
- **IndexedDB** -- Stores data locally in the browser for offline access
- **Operation Queue** -- Queues changes made offline and syncs them when connectivity is restored

## Using Fetch Offline

1. **Install as PWA** (recommended): Use "Add to Home Screen" in your mobile browser. This ensures the full app is cached.
2. **Open the app** while offline -- it loads from the cached version
3. **Browse lists and items** from the local database
4. **Make changes** -- additions, edits, and deletions are queued
5. **Reconnect** -- queued operations sync automatically in the background

## Connection Status

The app displays a connection status indicator:

| Status | Meaning |
|--------|---------|
| **Connected** | WebSocket is active, real-time sync is working |
| **Disconnected** | No connection to the server |
| **Syncing** | Reconnected and sending queued changes |
| **Error** | A sync error occurred |

An offline banner appears when the app detects no network connectivity.

## Real-Time Sync

When online, Fetch uses WebSocket connections for real-time updates:

- Changes made on one device appear instantly on all others
- The WebSocket automatically reconnects with exponential backoff (1s to 30s)
- A heartbeat ping every 25 seconds keeps the connection alive
- If the connection drops, the app switches to offline mode seamlessly

## Import and Export

You can export your data as a JSON file for backup or transfer:

1. Go to Settings
2. Choose Export to download your data
3. Select which lists, templates, and history to include

To import:

1. Go to Settings
2. Choose Import and select a JSON file
3. Preview the import to see what will be added
4. Choose **Merge** (add to existing data) or **Replace** (overwrite existing data)
5. Select which categories to import (lists, templates, history)

The maximum import file size is 10 MB.
