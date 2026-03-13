# Troubleshooting

## Common Issues

### App won't load or shows a blank page

**Cause**: The client build may be missing or the server can't find the static files.

**Fix**:
1. Run `bun run build` to build all workspaces
2. Verify `client/dist/` exists and contains `index.html`
3. In Docker, verify the container started successfully: `docker compose logs fetch`

### "Invalid credentials" when logging in

**Cause**: The password doesn't match `APP_PASSWORD`.

**Fix**:
1. Check your `.env` file or Docker environment variable for `APP_PASSWORD`
2. Passwords are case-sensitive
3. If using Docker Compose, restart after changing `.env`: `docker compose down && docker compose up -d`

### Rate limited / locked out after too many login attempts

**Cause**: After 5 failed login attempts within 15 minutes, the IP is locked out for 30 minutes.

**Fix**:
- Wait 30 minutes for the lockout to expire automatically
- Or restart the server to reset all rate limits (the rate limit table is in SQLite)

### WebSocket connection keeps dropping

**Cause**: Reverse proxy timeout, network instability, or firewall issues.

**Fix**:
1. If behind a reverse proxy, configure WebSocket support (see [Reverse Proxy](deployment/reverse-proxy.md))
2. Nginx requires `proxy_read_timeout` to be increased (default 60s, recommend 86400s)
3. The client automatically reconnects with exponential backoff (1s to 30s)
4. Check browser console for WebSocket error messages

### Changes not syncing between devices

**Cause**: WebSocket connection may be disconnected.

**Fix**:
1. Check the connection status indicator in the app
2. Verify both devices are connected to the same Fetch server
3. Check server logs for WebSocket errors
4. Refresh the page to force a reconnect

### Offline changes lost after reconnecting

**Cause**: The operation queue may have failed to sync.

**Fix**:
1. Check the connection status -- it should show "Syncing" when reconnecting
2. Verify the server is accessible from the device
3. Check browser console for sync errors
4. As a fallback, export your data before clearing browser storage

### Database errors or corruption

**Cause**: File permissions, disk space, or abrupt shutdown.

**Fix**:
1. Check that the data directory has write permissions
2. In Docker: verify the volume is mounted correctly (`docker inspect fetch`)
3. Check available disk space
4. If the database is corrupted, restore from a backup (see [Backup and Restore](deployment/backup-restore.md))

### Docker container won't start

**Cause**: Missing required environment variables or port conflicts.

**Fix**:
1. Ensure `APP_PASSWORD` is set (unless `DISABLE_AUTH=true`)
2. Check if port 3000 is already in use: `lsof -i :3000`
3. Check container logs: `docker compose logs fetch`
4. Verify the data volume exists: `docker volume ls`

### Import fails with "Invalid data" error

**Cause**: The import file format doesn't match the expected schema.

**Fix**:
1. Ensure the file is a valid JSON export from Fetch (version `1.0.0`)
2. The file must contain `version`, `exported_at`, and `lists` fields at minimum
3. Maximum import file size is 10 MB
4. Use the Preview function first to validate the file

## FAQ

**Q: Can multiple people use the same Fetch instance?**
A: Yes. Everyone uses the same password and shares the same data. Fetch is designed for couples and families sharing shopping lists.

**Q: Is my data encrypted?**
A: Data at rest in SQLite is not encrypted. Use HTTPS (SSL/TLS) to encrypt data in transit. See [SSL/TLS Configuration](deployment/ssl-tls.md).

**Q: Can I access the API programmatically?**
A: Yes. Set `API_TOKEN` in your environment and use Bearer token authentication. See [API Authentication](api/authentication.md).

**Q: How do I migrate to a new server?**
A: Export your data from Settings (JSON format), set up the new instance, then import the file. Or copy the SQLite database file directly.

**Q: What browsers are supported?**
A: Any modern browser with PWA support -- Chrome, Firefox, Safari, Edge. For the best experience, use Chrome or Edge which have full PWA install support.

**Q: How much data can Fetch handle?**
A: SQLite handles large datasets well. Practical limits depend on your server's disk space and memory. The app is designed for typical household shopping lists.

**Q: Can I run Fetch behind a VPN instead of exposing it publicly?**
A: Yes. Set `DISABLE_AUTH=true` if your VPN handles authentication, or keep `APP_PASSWORD` for an additional layer of security.

## Error Messages

| Error | Status | Meaning |
|-------|--------|---------|
| `Invalid credentials` | 401 | Wrong password on login |
| `Unauthorized` | 401 | Session expired or invalid, need to log in again |
| `Too many login attempts` | 429 | Rate limited, wait for lockout period |
| `A list with this name already exists` | 409 | List names must be unique (case-insensitive) |
| `Route {method} {path} not found` | 404 | The API endpoint doesn't exist |
| `Invalid JSON` | 400 | Request body is not valid JSON |
| `Name must be between 1 and 100 characters` | 400 | Name field validation failed |
| `Internal server error` | 500 | Unexpected error -- check server logs |

## Support

- **Issues**: File a bug report on the project's issue tracker
- **Source code**: Review the codebase for implementation details
- **Logs**: Check server logs (`docker compose logs -f`) for detailed error information
