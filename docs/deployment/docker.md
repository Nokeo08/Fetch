# Docker Deployment

Fetch ships as a single container with both the frontend and backend. Pre-built multi-platform images (`linux/amd64`, `linux/arm64`) are published to the GitHub Container Registry.

## Container Registry

```
ghcr.io/nokeo08/fetch
```

Available tags:
- `latest` -- latest version tag release
- `<version>` -- specific release (e.g., `0.1.0`)
- `<major>.<minor>` -- latest patch for a release line (e.g., `0.1`)
- `sha-<hash>` -- specific commit

## Quick Start

### Docker Run (from registry)

```bash
docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=your-secure-password \
  -v fetch-data:/data \
  --restart unless-stopped \
  ghcr.io/nokeo08/fetch:latest
```

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/Nokeo08/Fetch
cd fetch

# Configure
cp .env.example .env
# Edit .env and set APP_PASSWORD

# Start
docker compose up -d

# Check status
docker compose ps
docker compose logs -f

# Stop
docker compose down
```

### Build from Source

```bash
docker build -t fetch .

docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=your-secure-password \
  -v fetch-data:/data \
  --restart unless-stopped \
  fetch
```

### Production Deployment

For production, use the compose override file for resource limits and log rotation:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

This adds:
- Memory limit: 256 MB (reservation: 64 MB)
- CPU limit: 1.0 (reservation: 0.25)
- Log rotation: 10 MB max size, 3 files

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PASSWORD` | Yes* | - | Password for authentication |
| `DISABLE_AUTH` | No | `false` | Set to `true` to disable auth |
| `API_TOKEN` | No | - | Bearer token for REST API access |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_PATH` | No | `/data/fetch.db` | SQLite database path |
| `SESSION_SECRET` | No | random | Session cookie encryption secret |
| `NODE_ENV` | No | `production` | Node environment |

\* Required unless `DISABLE_AUTH=true`

## Data Persistence

The SQLite database is stored in `/data` inside the container. **You must mount a volume to persist data across container restarts.**

```bash
# Named volume (recommended)
docker run -v fetch-data:/data ...

# Bind mount to host directory
docker run -v /path/on/host:/data ...
```

To inspect the volume:

```bash
docker volume inspect fetch-data
```

## Health Check

The container includes a built-in health check:

- **Endpoint**: `GET /health`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Start period**: 10 seconds
- **Retries**: 3

Check health status:

```bash
docker inspect --format='{{.State.Health.Status}}' fetch
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "latency": 1
  }
}
```

## Image Details

- **Registry**: `ghcr.io/nokeo08/fetch`
- **Platforms**: `linux/amd64`, `linux/arm64`
- **Base image**: `oven/bun:1.3.10-alpine` (pinned version)
- **Multi-stage build**: Build stage installs all dependencies, runtime stage copies only production files
- **Non-root user**: Runs as `fetch` (UID 1001)
- **Exposed port**: 3000
- **No secrets baked in**: All configuration via environment variables

## Updating

### From Registry

```bash
docker pull ghcr.io/nokeo08/fetch:latest
docker compose down
docker compose up -d
```

### From Source

```bash
git pull
docker compose down
docker compose build
docker compose up -d
```

Your data persists in the Docker volume across rebuilds.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs fetch

# Common issues:
# - APP_PASSWORD not set (required unless DISABLE_AUTH=true)
# - Port 3000 already in use
# - Volume permission issues
```

### Database permission errors

The container runs as UID 1001. If using a bind mount, ensure the host directory is writable:

```bash
mkdir -p /path/on/host
chown 1001:1001 /path/on/host
```
