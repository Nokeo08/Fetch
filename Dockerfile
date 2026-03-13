# =============================================================================
# Fetch - Multi-stage Docker Build
# =============================================================================
# A self-hosted PWA shopping list application
#
# Build:  docker build -t fetch .
# Run:    docker run -d -p 3000:3000 -e APP_PASSWORD=secret -v fetch-data:/data fetch
#
# Environment Variables:
#   APP_PASSWORD    - Required. Password for authentication
#   DISABLE_AUTH    - Optional. Set to "true" to disable auth (default: false)
#   API_TOKEN       - Optional. Token for REST API access
#   PORT            - Optional. HTTP server port (default: 3000)
#   DATABASE_PATH   - Optional. SQLite database path (default: /data/fetch.db)
#   SESSION_SECRET  - Optional. Session encryption secret (auto-generated if unset)
#   NODE_ENV        - Optional. Node environment (default: production)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.10-alpine AS builder

WORKDIR /app

# Copy workspace package files for dependency caching
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install all dependencies (--ignore-scripts to defer postinstall build
# until source files are available)
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source files
COPY shared/ shared/
COPY server/ server/
COPY client/ client/
COPY static/ static/

# Build all workspaces: shared types -> server types -> client bundle
# VITE_SERVER_URL and VITE_WS_URL are empty so the client uses relative URLs
ENV VITE_SERVER_URL=""
ENV VITE_WS_URL=""
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.10-alpine

WORKDIR /app

# Create non-root user and data directory in single layer
RUN addgroup -g 1001 -S fetch && \
    adduser -S fetch -u 1001 -G fetch && \
    mkdir -p /data && chown fetch:fetch /data

# Copy only the server's runtime dependencies (hono, dotenv - zero transitive deps)
COPY --from=builder --chown=fetch:fetch /app/node_modules/hono/ node_modules/hono/
COPY --from=builder --chown=fetch:fetch /app/node_modules/dotenv/ node_modules/dotenv/

# Copy built shared types (workspace dependency)
COPY --from=builder --chown=fetch:fetch /app/shared/dist/ shared/dist/
COPY --chown=fetch:fetch shared/package.json shared/

# Copy server source (Bun runs TypeScript directly) and package.json
COPY --from=builder --chown=fetch:fetch /app/server/src/ server/src/
COPY --chown=fetch:fetch server/package.json server/

# Copy built client to server's public directory for static serving
COPY --from=builder --chown=fetch:fetch /app/client/dist/ server/public/

# Copy static assets (icons, banner)
COPY --from=builder --chown=fetch:fetch /app/static/ static/

# Copy TypeScript config needed at runtime for path resolution
COPY --from=builder --chown=fetch:fetch /app/tsconfig.json ./
COPY --from=builder --chown=fetch:fetch /app/server/tsconfig.json server/

# Switch to non-root user
USER fetch

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/fetch.db

# Exposed port (configurable via PORT env var)
EXPOSE 3000

# Health check: verify server is responding
# Interval: 30s, Timeout: 3s, Retries: 3, Start period: 10s
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the server
CMD ["bun", "run", "server/src/server.ts"]
