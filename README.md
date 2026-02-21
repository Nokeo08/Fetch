# Fetch

A lightweight, self-hosted Progressive Web App (PWA) for managing shopping lists with real-time synchronization across devices. Built with Bun, Hono, Vite, and React.

## Features

- **Simple Authentication**: Single password, no complex registration
- **Privacy-Focused**: Self-hosted, your data stays with you
- **Real-Time Sync**: Updates sync instantly across all devices
- **Offline Support**: Works without internet, syncs when back online
- **PWA**: Install on mobile devices like a native app
- **Multi-Language**: Support for multiple languages

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.2.0

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd fetch

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Edit .env and set your APP_PASSWORD
# (Required unless DISABLE_AUTH=true)
```

### Development

```bash
# Start all services
bun run dev

# Or run individually:
bun run dev:client    # Frontend only
bun run dev:server    # Backend only
```

### Production Build

```bash
bun run build
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PASSWORD` | Yes* | - | Password for authentication |
| `DISABLE_AUTH` | No | false | Disable auth (for reverse proxy) |
| `API_TOKEN` | No | - | Token for REST API access |
| `PORT` | No | 3000 | HTTP server port |
| `DATABASE_PATH` | No | ./data/fetch.db | Database file path |
| `SESSION_SECRET` | No | random | Session encryption secret |

*Required unless `DISABLE_AUTH=true`

## Project Structure

```
fetch/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── App.tsx         # Main application
│       └── main.tsx        # Entry point
├── server/                 # Hono backend
│   └── src/
│       ├── config/         # Configuration management
│       ├── db/             # Database layer
│       │   ├── client.ts   # Database client
│       │   ├── schema.ts   # Table definitions
│       │   └── migrations.ts
│       ├── services/       # Business logic
│       │   ├── lists.ts
│       │   ├── sections.ts
│       │   └── items.ts
│       └── index.ts        # API routes
├── shared/                 # Shared types
│   └── src/types/
│       ├── entities.ts     # Domain types
│       ├── api.ts          # API request/response types
│       └── events.ts       # WebSocket events
├── .env.example            # Environment template
└── AGENTS.md               # AI agent guidelines
```

## API Endpoints

### Health
- `GET /health` - Health check endpoint

### Lists
- `GET /api/v1/lists` - Get all lists
- `POST /api/v1/lists` - Create a list
- `GET /api/v1/lists/:id` - Get single list
- `PUT /api/v1/lists/:id` - Update list
- `DELETE /api/v1/lists/:id` - Delete list

### Sections
- `GET /api/v1/lists/:id/sections` - Get sections
- `POST /api/v1/lists/:id/sections` - Create section

### Items
- `GET /api/v1/sections/:id/items` - Get items
- `POST /api/v1/sections/:id/items` - Create item

## Deployment

### Docker

```bash
# Build image
docker build -t fetch .

# Run container
docker run -p 3000:3000 -v fetch-data:/app/data -e APP_PASSWORD=yourpassword fetch
```

### Railway / Render / Fly.io

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed deployment configurations.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
