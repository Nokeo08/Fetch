# Story 17: Container Deployment

**Priority:** Medium  
**Phase:** 5 - Deployment & Docs  
**Estimate:** 1-2 days  
**Dependencies:** Story 1

## Story

As a system administrator, I want to deploy Fetch using containers so that I can run it consistently across different environments.

## Acceptance Criteria

### Dockerfile
- [x] Multi-stage build for smaller image
- [x] Stage 1: Build environment with all dependencies
- [x] Stage 2: Runtime environment with only necessary files
- [ ] Final image < 100 MB
- [x] Non-root user execution
- [x] Health check configured
- [x] Exposed port documented

### Build Context
- [x] `.dockerignore` file to exclude:
  - `.git`
  - `node_modules` or vendor directories
  - Test files
  - Documentation
  - Local development files
  - Database files

### Environment Variables
- [x] All config via environment variables
- [x] Default values where appropriate
- [x] Documented in Dockerfile comments
- [x] Example values shown

### Data Persistence
- [x] Volume for database directory
- [x] Volume path documented
- [x] Database directory created if not exists
- [x] Proper permissions on volume

### Health Check
- [x] Health check endpoint configured
- [x] Interval: 30s
- [x] Timeout: 3s
- [x] Retries: 3
- [x] Command checks `/health` endpoint

### Docker Compose
- [x] `compose.yaml` file provided
- [x] Service definition with:
  - Build context
  - Port mapping
  - Environment variables
  - Volume mounts
  - Restart policy
- [x] Separate `compose.prod.yaml` (optional)
- [x] Environment file template (`.env.example`)

### Build and Run Instructions
- [x] Clear README section on Docker usage
- [x] Build command documented
- [x] Run command documented
- [x] Volume mounting explained
- [x] Environment variables listed

### Security
- [x] Use specific base image tags (not `latest`)
- [x] Regular security updates
- [x] Minimal attack surface
- [x] No secrets in image
- [x] Non-root user

## Technical Notes

### Image Size

The final image is ~168 MB. The 100 MB target is not achievable with the Bun runtime:
- Bun binary alone: 93 MB
- Alpine base: 9 MB
- Base image total: ~108 MB (before any app code)
- App code + deps: ~10 MB (hono, dotenv, shared types, client dist, static assets)

The image is heavily optimized: only 2 runtime dependencies (hono, dotenv) are copied
instead of the full node_modules. To get under 100 MB would require switching to
Node.js (which cannot run TypeScript directly) or using a custom minimal base image.

### Example Dockerfile (Generic)
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy only necessary files
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./

# Create data directory
RUN mkdir -p /data && chown nodejs:nodejs /data

USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/fetch.db

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Docker Compose Example
```yaml
version: '3.8'

services:
  fetch:
    build: .
    container_name: fetch
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - APP_PASSWORD=${APP_PASSWORD}
      - API_TOKEN=${API_TOKEN}
      - PORT=3000
      - DATABASE_PATH=/data/fetch.db
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./data:/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### .dockerignore
```
.git
.gitignore
README.md
Dockerfile
.dockerignore
node_modules
npm-debug.log
.env
.env.local
data/
*.db
*.sqlite
.vscode
.idea
*.test.js
coverage/
docs/
```

### Build Commands
```bash
# Build image
docker build -t fetch:latest .

# Run container
docker run -d \
  --name fetch \
  -p 3000:3000 \
  -e APP_PASSWORD=secret \
  -e API_TOKEN=token123 \
  -v $(pwd)/data:/data \
  fetch:latest

# Using Docker Compose
docker-compose up -d
```

## Dependencies

- Story 1: Project Setup
- Story 3: HTTP Server (for health check)

## Definition of Done

- [x] Dockerfile builds successfully
- [ ] Image size < 100 MB
- [x] Container runs as non-root
- [x] Health check passes
- [x] Volume persists data
- [x] compose.yaml works
- [x] Documentation complete
- [x] Tested locally
