# Getting Started

This guide walks you through setting up Fetch and using it for the first time.

## First-Time Setup

### Option 1: Docker (Recommended)

The fastest way to get running:

```bash
docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=your-secure-password \
  -v fetch-data:/data \
  ghcr.io/nokeo08/fetch:latest
```

Open `http://localhost:3000` in your browser.

### Option 2: Docker Compose

```bash
# Clone the repository
git clone https://github.com/Nokeo08/Fetch
cd fetch

# Configure
cp .env.example .env
# Edit .env and set APP_PASSWORD to a strong password

# Start
docker compose up -d
```

### Option 3: From Source

Prerequisites:
- [Bun](https://bun.sh) >= 1.2.0
- Git

```bash
git clone https://github.com/Nokeo08/Fetch
cd fetch
bun install
cp .env.example .env
# Edit .env and set APP_PASSWORD

bun run dev
```

The app runs at `http://localhost:5173` (client) and `http://localhost:3000` (API).

## Logging In

1. Navigate to your Fetch instance in a browser
2. Enter the password you set in `APP_PASSWORD`
3. Your session lasts 7 days before requiring re-authentication

## Creating Your First List

1. After logging in, you'll see the Lists page
2. Tap the add button to create a new list
3. Enter a name (e.g., "Groceries") and optionally choose an icon
4. The new list becomes your active list automatically

## Adding Items

1. Open a list by tapping on it
2. Items are organized into **sections** (e.g., "Produce", "Dairy", "Bakery")
3. Add a section first, then add items to it
4. Each item can have:
   - **Name** (required) -- What to buy
   - **Quantity** -- How much (e.g., "2 lbs", "1 dozen")
   - **Description** -- Additional notes
5. As you type, Fetch suggests items from your history

## Using Templates

Templates let you save and reuse common list configurations:

1. Go to Settings and find Templates
2. Create a template manually, or create one from an existing list
3. To apply a template, select a list and choose which template to apply
4. Template items are added to matching sections (or new sections are created)
5. Duplicate items are automatically skipped

## Tips and Tricks

- **Install as PWA**: On mobile, use "Add to Home Screen" in your browser menu for a native app experience
- **Offline mode**: The app works without internet and syncs automatically when reconnected
- **Item states**: Tap an item to cycle through Active, Completed, and Uncertain states
- **Reordering**: Drag sections, items, and lists to reorder them
- **History**: Item names are remembered -- start typing to get autocomplete suggestions
- **Real-time sync**: Open Fetch on multiple devices and changes appear instantly
- **Keyboard shortcuts**: Press Enter to quickly save items and sections
- **Import/Export**: Back up your data from Settings, or transfer between instances
