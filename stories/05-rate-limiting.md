# Story 5: Login Rate Limiting

**Priority:** Medium  
**Phase:** 2 - Core Features  
**Estimate:** 1-2 days  
**Dependencies:** Story 4
**Status:** ✅ Complete

## Story

As a security measure, I want login attempts to be rate-limited so that brute force attacks are prevented.

## Acceptance Criteria

### Rate Limit Tracking
- [x] Track failed login attempts by IP address
- [x] Store rate limit data in database
- [x] Persist across application restarts
- [x] Track last attempt timestamp

### Rate Limit Rules
- [x] Maximum 5 failed attempts per 15 minutes per IP
- [x] After 5 failures, lock account for 30 minutes
- [x] Return 429 Too Many Requests when rate limited
- [x] Include Retry-After header with lockout time

### Rate Limit Reset
- [x] Counter resets after successful login
- [x] Counter resets after 15 minutes of no attempts
- [x] Lockout expires automatically after 30 minutes

### Error Messages
- [x] Generic error message for failed login ("Invalid credentials")
- [x] No information leaked about password correctness
- [x] Rate limit message indicates wait time

### Database Schema
```sql
CREATE TABLE rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_until DATETIME
);
```

## Technical Notes

### Rate Limit Algorithm
```
ON LOGIN ATTEMPT:
  1. Get or create rate_limit record for IP
  2. IF locked_until > NOW():
       RETURN 429 with retry time
  3. IF last_attempt > 15 minutes ago:
       Reset attempts to 0
  4. Increment attempts
  5. Update last_attempt
  6. IF attempts >= 5:
       Set locked_until = NOW() + 30 minutes
       RETURN 429
  7. Validate password
  8. IF password correct:
       Reset attempts to 0
       Proceed with login
     ELSE:
       RETURN 401 (generic error)
```

### Security Considerations
- Rate limiting should not be bypassed by changing IP (if possible)
- Consider X-Forwarded-For header for proxied deployments
- Log rate limit events for monitoring

## Dependencies

- Story 4: Session-Based Authentication ✅

## Definition of Done

- [x] Failed attempts tracked by IP
- [x] Account locks after 5 failures
- [x] 429 returned with Retry-After header
- [x] Lockout expires after 30 minutes
- [x] Successful login resets counter
- [x] Rate limit data persists across restarts
- [x] Tests verify rate limiting behavior

## Implementation

### Files
- `server/src/services/rate-limits.ts` - Rate limiting service
- `server/src/index.ts` - Login endpoint with rate limiting
- `server/src/auth.test.ts` - Rate limiting unit tests
- `server/src/login.test.ts` - Integration tests for login with rate limiting

### Tests
- 27 tests for auth and login rate limiting
- 173 total tests passing
