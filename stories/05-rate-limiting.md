# Story 5: Login Rate Limiting

**Priority:** Medium  
**Phase:** 2 - Core Features  
**Estimate:** 1-2 days  
**Dependencies:** Story 4

## Story

As a security measure, I want login attempts to be rate-limited so that brute force attacks are prevented.

## Acceptance Criteria

### Rate Limit Tracking
- [ ] Track failed login attempts by IP address
- [ ] Store rate limit data in database
- [ ] Persist across application restarts
- [ ] Track last attempt timestamp

### Rate Limit Rules
- [ ] Maximum 5 failed attempts per 15 minutes per IP
- [ ] After 5 failures, lock account for 30 minutes
- [ ] Return 429 Too Many Requests when rate limited
- [ ] Include Retry-After header with lockout time

### Rate Limit Reset
- [ ] Counter resets after successful login
- [ ] Counter resets after 15 minutes of no attempts
- [ ] Lockout expires automatically after 30 minutes

### Error Messages
- [ ] Generic error message for failed login ("Invalid credentials")
- [ ] No information leaked about password correctness
- [ ] Rate limit message indicates wait time

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

- Story 4: Session-Based Authentication

## Definition of Done

- [ ] Failed attempts tracked by IP
- [ ] Account locks after 5 failures
- [ ] 429 returned with Retry-After header
- [ ] Lockout expires after 30 minutes
- [ ] Successful login resets counter
- [ ] Rate limit data persists across restarts
- [ ] Tests verify rate limiting behavior
