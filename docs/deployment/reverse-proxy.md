# Reverse Proxy Setup

Running Fetch behind a reverse proxy is common for production deployments. This enables SSL termination, custom domains, and integration with other services.

## Nginx

### Basic Configuration

```nginx
server {
    listen 80;
    server_name fetch.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name fetch.example.com;

    ssl_certificate /etc/letsencrypt/live/fetch.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fetch.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

The `proxy_read_timeout 86400s` is important for WebSocket connections. The default 60s timeout would cause frequent disconnections.

## Caddy

Caddy handles SSL automatically via Let's Encrypt:

```
fetch.example.com {
    reverse_proxy localhost:3000

    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3000
}
```

## Apache

```apache
<VirtualHost *:443>
    ServerName fetch.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/fetch.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/fetch.example.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/ws(.*)$ ws://localhost:3000/ws$1 [P,L]

    RequestHeader set X-Forwarded-Proto "https"
</VirtualHost>
```

Required Apache modules: `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_rewrite`, `mod_headers`.

## Disabling Built-in Auth

If your reverse proxy handles authentication (e.g., Authelia, Authentik, or OAuth2 Proxy), you can disable Fetch's built-in auth:

```bash
DISABLE_AUTH=true
```

When auth is disabled, all `/api/v1/*` routes are accessible without a session or token.

## Important Headers

Fetch uses these headers for security and functionality:

| Header | Purpose |
|--------|---------|
| `X-Forwarded-Proto` | Determines secure context for cookie settings |
| `X-Forwarded-For` | Client IP for rate limiting |
| `X-Real-IP` | Client IP fallback |
| `Upgrade` / `Connection` | Required for WebSocket |

Ensure your reverse proxy forwards these headers correctly.
