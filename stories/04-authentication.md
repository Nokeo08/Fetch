# Story 4: Session-Based Authentication

**Priority:** High  
**Phase:** 2 - Core Features  
**Estimate:** 2-3 days  
**Dependencies:** Story 2, Story 3
**Status:** ✅ Complete

## Story

As a user, I want to log in with a single password so that I can securely access my shopping lists without complex registration.

## Acceptance Criteria

### Login Page
- [x] Login page accessible at `/login`
- [x] Form has single password field
- [x] Form has submit button
- [x] Page is styled and responsive
- [x] Accessible without authentication

### Password Configuration
- [x] Password configurable via `APP_PASSWORD` environment variable
- [x] Application refuses to start without password (unless auth disabled)
- [x] Password validated using constant-time comparison
- [x] Password never logged or displayed

### Session Creation
- [x] Successful login creates session
- [x] Session token is cryptographically secure random string (32+ bytes)
- [x] Session stored in database with expiration (7 days)
- [x] Session cookie set with:
  - HttpOnly flag
  - Secure flag (in production)
  - SameSite attribute
  - Appropriate expiration

### Session Validation
- [x] Middleware validates session on protected routes
- [x] Invalid/expired session redirects to login
- [x] Session extended on activity (optional)
- [x] Last activity timestamp updated

### Logout
- [x] Logout endpoint at `/api/logout`
- [x] Session removed from database
- [x] Cookie cleared
- [x] Redirect to login page

### Optional: Disable Authentication
- [x] `DISABLE_AUTH` environment variable disables auth
- [x] When disabled, all routes accessible
- [x] Useful for reverse proxy authentication
- [x] Warning logged when auth is disabled

## Technical Notes

### Session Cookie Configuration
- Name: `session`
- Path: `/`
- MaxAge: 7 days
- HttpOnly: true
- Secure: true (in production)
- SameSite: Lax

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

### Implemented Structure
```
server/src/
├── middleware/
│   └── auth.ts          # Auth middleware, cookie helpers, constant-time comparison
├── services/
│   ├── sessions.ts      # Session CRUD with last_activity tracking
│   └── rate-limits.ts   # Rate limiting for login attempts
└── index.ts             # Login, logout, and /api/me endpoints

client/src/
├── Login.tsx            # Login page component
├── Login.css            # Login page styles
├── AuthContext.tsx      # Auth state management
└── main.tsx             # Router setup with protected routes
```

### Test Coverage
- 17 tests for auth middleware, sessions, and rate limiting

## Dependencies

- Story 2: Database Schema ✅
- Story 3: HTTP Server ✅

## Definition of Done

- [x] Can log in with configured password
- [x] Session persists across requests
- [x] Protected routes require authentication
- [x] Logout clears session
- [x] Session expires after 7 days
- [x] Security headers and cookie flags are correct
- [x] Tests cover login/logout flows
