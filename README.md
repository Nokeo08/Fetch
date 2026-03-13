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

The application ships as a single container with both frontend and backend. The multi-stage build produces a minimal Alpine-based image.

#### Quick Start with Docker Compose (Recommended)

```bash
# Copy environment template and set your password
cp .env.example .env
# Edit .env and set APP_PASSWORD

# Start the application
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

#### Build and Run Manually

```bash
# Build the image
docker build -t fetch .

# Run the container
docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=your-secure-password \
  -v fetch-data:/data \
  fetch

# Check health
curl http://localhost:3000/health
```

#### Production Deployment

For production, use the compose override file for resource limits and log rotation:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

#### Volume Mounting

The application stores its SQLite database in the `/data` directory inside the container. This **must** be mounted as a volume to persist data across container restarts.

```bash
# Named volume (recommended)
docker run -v fetch-data:/data ...

# Bind mount to host directory
docker run -v /path/on/host:/data ...
```

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PASSWORD` | Yes* | - | Password for authentication |
| `DISABLE_AUTH` | No | `false` | Set to `true` to disable auth |
| `API_TOKEN` | No | - | Token for REST API access |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_PATH` | No | `/data/fetch.db` | SQLite database file path |
| `SESSION_SECRET` | No | random | Session encryption secret |
| `NODE_ENV` | No | `production` | Node environment |

\* Required unless `DISABLE_AUTH=true`

#### Security Notes

- The container runs as a non-root user (`fetch`, UID 1001)
- No secrets are baked into the image; all config is via environment variables
- Uses a specific base image tag (`oven/bun:1.3.9-alpine`), not `latest`
- Health check endpoint at `/health` is configured with 30s interval, 3s timeout, 3 retries

### Railway / Render / Fly.io

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed deployment configurations.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
