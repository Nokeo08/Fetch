# SSL/TLS Configuration

HTTPS is strongly recommended for production deployments. It encrypts data in transit and enables secure cookies, PWA installation from the browser, and service worker support.

## Option 1: Reverse Proxy with Let's Encrypt (Recommended)

The simplest approach is to terminate TLS at a reverse proxy. See [Reverse Proxy Setup](reverse-proxy.md) for Nginx, Caddy, and Apache configurations.

### Using Certbot (Nginx)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d fetch.example.com

# Auto-renewal is configured automatically
# Test with:
sudo certbot renew --dry-run
```

### Using Caddy

Caddy obtains and renews TLS certificates automatically. No additional configuration needed:

```
fetch.example.com {
    reverse_proxy localhost:3000
}
```

## Option 2: Docker with Traefik

Traefik is a reverse proxy designed for containers with automatic Let's Encrypt:

```yaml
# compose.yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  fetch:
    build: .
    environment:
      - APP_PASSWORD=${APP_PASSWORD}
    volumes:
      - fetch-data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fetch.rule=Host(`fetch.example.com`)"
      - "traefik.http.routers.fetch.entrypoints=websecure"
      - "traefik.http.routers.fetch.tls.certresolver=letsencrypt"

volumes:
  fetch-data:
  letsencrypt:
```

## Secure Cookie Behavior

Fetch automatically sets the `Secure` flag on session cookies when it detects HTTPS (via `X-Forwarded-Proto: https` header or the request URL). Ensure your reverse proxy sends this header.

## HSTS

When served over HTTPS, Fetch sets the `Strict-Transport-Security` header:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

This tells browsers to always use HTTPS for future requests. The header is only set when the request is detected as secure.
