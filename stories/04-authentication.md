# Story 4: Session-Based Authentication

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 2, Story 3

## Story

As a user, I want to log in with a single password so that I can securely access my shopping lists without complex registration.

## Acceptance Criteria

### Login Page
- [ ] Login page accessible at `/login`
- [ ] Form has single password field
- [ ] Form has submit button
- [ ] Page is styled and responsive
- [ ] Accessible without authentication

### Password Configuration
- [ ] Password configurable via `APP_PASSWORD` environment variable
- [ ] Application refuses to start without password (unless auth disabled)
- [ ] Password validated using constant-time comparison
- [ ] Password never logged or displayed

### Session Creation
- [ ] Successful login creates session
- [ ] Session token is cryptographically secure random string (32+ bytes)
- [ ] Session stored in database with expiration (7 days)
- [ ] Session cookie set with:
  - HttpOnly flag
  - Secure flag (in production)
  - SameSite attribute
  - Appropriate expiration

### Session Validation
- [ ] Middleware validates session on protected routes
- [ ] Invalid/expired session redirects to login
- [ ] Session extended on activity (optional)
- [ ] Last activity timestamp updated

### Logout
- [ ] Logout endpoint at `/logout`
- [ ] Session removed from database
- [ ] Cookie cleared
- [ ] Redirect to login page

### Optional: Disable Authentication
- [ ] `DISABLE_AUTH` environment variable disables auth
- [ ] When disabled, all routes accessible
- [ ] Useful for reverse proxy authentication
- [ ] Warning logged when auth is disabled

## Technical Notes

### Session Cookie Configuration
- Name: `session` (or configurable)
- Path: `/`
- MaxAge: 7 days
- HttpOnly: true
- Secure: true (in production)
- SameSite: Strict or Lax

### Database Schema for Sessions
```sql
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Session Validation Flow
1. Extract session cookie from request
2. Look up session in database
3. Check if session is expired
4. If valid, attach user context to request
5. If invalid, redirect to login

## Dependencies

- Story 2: Database Schema
- Story 3: HTTP Server

## Definition of Done

- [ ] Can log in with configured password
- [ ] Session persists across requests
- [ ] Protected routes require authentication
- [ ] Logout clears session
- [ ] Session expires after 7 days
- [ ] Security headers and cookie flags are correct
- [ ] Tests cover login/logout flows
