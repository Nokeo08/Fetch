<p align="center">
  <img src="static/banner.png" alt="Fetch banner" />
</p>

<h1 align="center">Fetch</h1>

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> A lightweight, self-hosted shopping list app for couples and families

Fetch is a Progressive Web App (PWA) for managing shopping lists with real-time synchronization across devices. Built with Bun, Hono, React, and SQLite.

This project was built primarily as a learning exercise and is almost a bit-for-bit copy of [Koffan](https://github.com/PanSalut/Koffan) by PanSalut.

## Features

- **Real-time sync** -- Updates appear instantly across all connected devices via WebSocket
- **Progressive Web App** -- Install on any device like a native app
- **Offline support** -- Works without internet, syncs automatically when reconnected
- **Templates** -- Save and reuse common shopping list configurations
- **Import/Export** -- Full data portability with JSON import and export
- **Multi-language** -- 13 languages supported (EN, DE, ES, FR, PT, RU, and more)
- **Simple auth** -- Single password, no registration required
- **Self-hosted** -- Your data stays on your server
- **API access** -- Full REST API with optional bearer token authentication

## Screenshots

> Screenshots can be added to the `client/public/screenshots/` directory and referenced here.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=your-secure-password \
  -v fetch-data:/data \
  --restart unless-stopped \
  ghcr.io/nokeo08/fetch:latest
```

Or with Docker Compose:

```bash
cp .env.example .env
# Edit .env and set APP_PASSWORD

docker compose up -d
```

To build from source:

```bash
docker build -t fetch .
```

Multi-platform images (`linux/amd64`, `linux/arm64`) are published to `ghcr.io/nokeo08/fetch` on version tags (`v*`) and via manual workflow dispatch.

Open `http://localhost:3000` and log in with your password.

The container runs as a non-root user, includes a health check at `/health`, and stores data in `/data` (must be mounted as a volume). See the [Docker Deployment Guide](docs/deployment/docker.md) for full details.

### From Source

```bash
# Prerequisites: Bun >= 1.2.0

git clone https://github.com/Nokeo08/Fetch
cd fetch
bun install
cp .env.example .env
# Edit .env and set APP_PASSWORD

bun run dev
```

See the [Getting Started Guide](docs/getting-started.md) for detailed instructions.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PASSWORD` | Yes* | - | Password for authentication |
| `DISABLE_AUTH` | No | `false` | Disable auth (for reverse proxy setups) |
| `API_TOKEN` | No | - | Bearer token for REST API access |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_PATH` | No | `./data/fetch.db` | SQLite database file path |
| `SESSION_SECRET` | No | random | Secret for session cookie encryption |

\* Required unless `DISABLE_AUTH=true`

**Client-side variables** (set at build time):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | `http://localhost:3000` | API base URL (empty string for relative URLs) |
| `VITE_WS_URL` | auto-detected | WebSocket URL (empty string for auto-detection) |

See the [Environment Variables Reference](docs/deployment/docker.md#environment-variables) for full details.

## Documentation

- **[Getting Started](docs/getting-started.md)** -- First-time setup and basic usage
- **User Guide**
  - [Managing Lists](docs/user-guide/managing-lists.md)
  - [Items and Sections](docs/user-guide/items.md)
  - [Templates](docs/user-guide/templates.md)
  - [Offline Mode](docs/user-guide/offline-mode.md)
- **Developer Guide**
  - [Architecture](docs/developer-guide/architecture.md)
  - [Development Setup](docs/developer-guide/development-setup.md)
  - [Contributing](CONTRIBUTING.md)
- **Deployment**
  - [Docker](docs/deployment/docker.md)
  - [Reverse Proxy](docs/deployment/reverse-proxy.md)
  - [SSL/TLS](docs/deployment/ssl-tls.md)
  - [Backup and Restore](docs/deployment/backup-restore.md)
- **[API Reference](docs/api/README.md)**
  - [OpenAPI Specification](docs/api/openapi.yaml)
  - [Authentication](docs/api/authentication.md)
- **[Troubleshooting](docs/troubleshooting.md)**
- **[Changelog](CHANGELOG.md)**

## Project Structure

```
fetch/
├── client/src/            # React + Vite frontend
│   ├── api/               # API client modules
│   ├── i18n/              # Internationalization (13 languages)
│   ├── App.tsx            # Main application component
│   ├── AuthContext.tsx     # Authentication state
│   ├── WebSocketContext.tsx# Real-time sync
│   ├── OfflineContext.tsx  # Offline detection
│   └── offlineDb.ts       # IndexedDB for offline storage
├── server/src/            # Hono backend
│   ├── config/            # Configuration management
│   ├── db/                # SQLite schema and migrations
│   ├── middleware/         # Auth, CORS, security, logging, errors
│   ├── services/          # Business logic (lists, sections, items, templates)
│   ├── sync/              # WebSocket broadcast
│   ├── websocket/         # Connection management
│   └── index.ts           # Route definitions
├── shared/src/types/      # Shared TypeScript type definitions
│   ├── entities.ts        # Domain models
│   ├── api.ts             # Request/response types
│   └── events.ts          # WebSocket event types
├── docs/                  # Documentation
├── stories/               # Feature specifications
├── Dockerfile             # Multi-stage production build
├── compose.yaml           # Docker Compose configuration
└── compose.prod.yaml      # Production resource limits
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, code style, and the pull request process.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.
