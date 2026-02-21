# Story 18: Cloud Platform Deployment

**Priority:** Low  
**Phase:** 5 - Deployment & Docs  
**Estimate:** 2-3 days  
**Dependencies:** Story 17

## Story

As a user, I want to deploy Fetch to cloud platforms with one-click so that I can get started without complex setup.

## Acceptance Criteria

### Railway
- [ ] `railway.json` configuration file
- [ ] Build command specified
- [ ] Start command specified
- [ ] Health check path configured
- [ ] Deploy button in README:
  ```markdown
  [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE)
  ```
- [ ] Environment variables documented

### Render
- [ ] `render.yaml` Blueprint configuration:
  ```yaml
  services:
    - type: web
      name: fetch
      runtime: docker
      plan: standard
      autoDeploy: true
      healthCheckPath: /health
      envVars:
        - key: APP_PASSWORD
          generateValue: true
        - key: DATABASE_PATH
          value: /data/fetch.db
      disk:
        name: data
        mountPath: /data
        sizeGB: 1
  ```
- [ ] Deploy button in README

### Fly.io
- [ ] `fly.toml` configuration:
  ```toml
  app = "fetch"
  primary_region = "iad"

  [build]
    dockerfile = "Dockerfile"

  [env]
    PORT = "8080"
    DATABASE_PATH = "/data/fetch.db"

  [[mounts]]
    source = "fetch_data"
    destination = "/data"

  [http_service]
    internal_port = 8080
    force_https = true
    auto_stop_machines = true
    auto_start_machines = true
    min_machines_running = 0

  [[vm]]
    memory = "256mb"
    cpu_kind = "shared"
    cpus = 1
  ```
- [ ] Deploy instructions in README

### Heroku
- [ ] `heroku.yml` configuration
- [ ] `app.json` manifest:
  ```json
  {
    "name": "Fetch",
    "description": "Lightweight shopping list app",
    "repository": "https://github.com/user/fetch",
    "logo": "https://raw.githubusercontent.com/user/fetch/main/logo.png",
    "keywords": ["shopping", "list", "pwa"],
    "stack": "container",
    "env": {
      "APP_PASSWORD": {
        "description": "Password for accessing the app",
        "generator": "secret"
      }
    },
    "addons": []
  }
  ```
- [ ] Deploy button in README

### DigitalOcean App Platform
- [ ] `.do/app.yaml` specification:
  ```yaml
  name: fetch
  region: nyc
  services:
    - name: web
      dockerfile_path: Dockerfile
      http_port: 3000
      instance_count: 1
      instance_size_slug: basic-xxs
      health_check:
        http_path: /health
        port: 3000
      envs:
        - key: APP_PASSWORD
          value: ${APP_PASSWORD}
        - key: DATABASE_PATH
          value: /data/fetch.db
      volumes:
        - name: data
          path: /data
  ```
- [ ] Deploy button

### Coolify
- [ ] Deployment documentation
- [ ] Docker Compose example
- [ ] Environment variables list
- [ ] Volume configuration

### Environment Variable Templates
- [ ] Template for each platform
- [ ] Required vs optional variables marked
- [ ] Default values provided
- [ ] Descriptions included

### Platform-Specific Notes
Document for each platform:
- [ ] Free tier availability
- [ ] Persistent storage limitations
- [ ] Scaling considerations
- [ ] Custom domain setup
- [ ] SSL/TLS handling

## Technical Notes

### Platform Comparison

| Platform | Free Tier | Persistent Storage | Notes |
|----------|-----------|-------------------|-------|
| Railway | Yes | Yes | Generous free tier |
| Render | Yes | Yes | 512 MB RAM limit |
| Fly.io | Yes | Yes | $5/mo credit |
| Heroku | No | No | Free tier discontinued |
| DigitalOcean | No | Yes | $5/mo minimum |
| Coolify | Self-hosted | Yes | Self-hosted option |

### README Badges
Add deploy buttons to README:

```markdown
## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
```

### Testing Deployments
Before publishing:
- [ ] Test each deployment button
- [ ] Verify app starts successfully
- [ ] Check database persistence
- [ ] Test authentication
- [ ] Verify all features work

## Dependencies

- Story 17: Container Deployment

## Definition of Done

- [ ] Railway configuration works
- [ ] Render configuration works
- [ ] Fly.io configuration works
- [ ] Heroku configuration works (optional)
- [ ] DigitalOcean configuration works
- [ ] Coolify documentation complete
- [ ] All deploy buttons tested
- [ ] README updated with deployment options
