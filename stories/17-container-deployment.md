# Story 17: Container Deployment

**Priority:** Medium  
**Phase:** 5 - Deployment & Docs  
**Estimate:** 1-2 days  
**Dependencies:** Story 1

## Story

As a system administrator, I want to deploy Fetch using containers so that I can run it consistently across different environments.

## Acceptance Criteria

### Dockerfile
- [ ] Multi-stage build for smaller image
- [ ] Stage 1: Build environment with all dependencies
- [ ] Stage 2: Runtime environment with only necessary files
- [ ] Final image < 100 MB
- [ ] Non-root user execution
- [ ] Health check configured
- [ ] Exposed port documented

### Build Context
- [ ] `.dockerignore` file to exclude:
  - `.git`
  - `node_modules` or vendor directories
  - Test files
  - Documentation
  - Local development files
  - Database files

### Environment Variables
- [ ] All config via environment variables
- [ ] Default values where appropriate
- [ ] Documented in Dockerfile comments
- [ ] Example values shown

### Data Persistence
- [ ] Volume for database directory
- [ ] Volume path documented
- [ ] Database directory created if not exists
- [ ] Proper permissions on volume

### Health Check
- [ ] Health check endpoint configured
- [ ] Interval: 30s
- [ ] Timeout: 3s
- [ ] Retries: 3
- [ ] Command checks `/health` endpoint

### Docker Compose
- [ ] `docker-compose.yaml` file provided
- [ ] Service definition with:
  - Build context
  - Port mapping
  - Environment variables
  - Volume mounts
  - Restart policy
- [ ] Separate `docker-compose.prod.yaml` (optional)
- [ ] Environment file template (`.env.example`)

### Build and Run Instructions
- [ ] Clear README section on Docker usage
- [ ] Build command documented
- [ ] Run command documented
- [ ] Volume mounting explained
- [ ] Environment variables listed

### Security
- [ ] Use specific base image tags (not `latest`)
- [ ] Regular security updates
- [ ] Minimal attack surface
- [ ] No secrets in image
- [ ] Non-root user

## Technical Notes

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

- [ ] Dockerfile builds successfully
- [ ] Image size < 100 MB
- [ ] Container runs as non-root
- [ ] Health check passes
- [ ] Volume persists data
- [ ] docker-compose.yaml works
- [ ] Documentation complete
- [ ] Tested locally
