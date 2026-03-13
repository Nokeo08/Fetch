# API Authentication

Fetch supports two authentication methods: session cookies and bearer tokens.

## Session Cookie Authentication

This is the primary method used by the web interface.

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"password": "your-password"}' \
  -c cookies.txt
```

Response:

```json
{
  "success": true,
  "data": { "message": "Logged in successfully" }
}
```

The server sets a `session` cookie that is:
- `httpOnly` -- Not accessible from JavaScript
- `secure` -- Only sent over HTTPS (when detected)
- `sameSite: Lax` -- CSRF protection
- Valid for 7 days

### Using the Session

Include the cookie in subsequent requests:

```bash
curl http://localhost:3000/api/v1/lists \
  -b cookies.txt
```

### Check Auth Status

```bash
curl http://localhost:3000/api/me \
  -b cookies.txt
```

Response:

```json
{ "success": true, "data": { "authenticated": true } }
```

### Logout

```bash
curl -X POST http://localhost:3000/api/logout \
  -b cookies.txt
```

## Bearer Token Authentication

For programmatic API access, set the `API_TOKEN` environment variable and use it as a bearer token.

### Setup

```bash
# In .env or Docker environment
API_TOKEN=your-secret-api-token
```

### Usage

```bash
curl http://localhost:3000/api/v1/lists \
  -H "Authorization: Bearer your-secret-api-token"
```

Bearer token authentication:
- Bypasses session management entirely
- Uses constant-time string comparison to prevent timing attacks
- Does not create or require a session cookie
- Is only checked if `API_TOKEN` is configured on the server

## Disabling Authentication

Set `DISABLE_AUTH=true` to skip all authentication checks. This is intended for deployments where a reverse proxy or VPN handles authentication.

When auth is disabled:
- All `/api/v1/*` routes are accessible without credentials
- The `/api/login` endpoint still works but is unnecessary
- The WebSocket endpoint is also unprotected

## Error Responses

### Invalid Credentials (401)

```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "UNAUTHORIZED"
}
```

### Expired Session (401)

```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### Rate Limited (429)

```json
{
  "success": false,
  "error": "Too many login attempts. Try again in 1800 seconds",
  "code": "TOO_MANY_REQUESTS"
}
```

Includes `Retry-After` header with seconds remaining.

## Security Notes

- Passwords are compared using constant-time comparison to prevent timing attacks
- Sessions are stored server-side in SQLite with a cryptographically random token
- Expired sessions are cleaned up automatically
- Rate limiting is per IP address (5 attempts per 15 minutes, 30-minute lockout)
- The `SESSION_SECRET` is used for cookie encryption; if not set, a random secret is generated at startup (sessions won't persist across server restarts)
