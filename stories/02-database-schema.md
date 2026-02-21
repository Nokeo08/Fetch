# Story 2: Database Schema and Migrations

**Priority:** High  
**Phase:** 1 - Foundation  
**Estimate:** 2-3 days  
**Dependencies:** Story 1
**Status:** ✅ Complete

## Story

As a developer, I need a database layer with proper schema and migrations so that application data can be persisted reliably and schema changes can be managed over time.

## Acceptance Criteria

### Database Connection
- [x] Configure database connection with pooling (SQLite uses file-based, pooling handled by Bun)
- [x] Set up connection retry logic
- [x] Configure appropriate timeouts (busy_timeout, WAL mode)
- [x] Handle connection errors gracefully (DatabaseError class)
- [x] Support multiple database types (SQLite only - by design)

### Schema Design
- [x] Create `sessions` table for user sessions
- [x] Create `lists` table for shopping lists
- [x] Create `sections` table for list sections
- [x] Create `items` table for shopping items
- [x] Create `history` table for item history
- [x] Create `templates` table for reusable templates
- [x] Create `template_items` table for template contents
- [x] Create `rate_limits` table for rate limiting data
- [x] Add appropriate indexes for performance
- [x] Set up foreign key constraints

### Migration System
- [x] Create migration framework or use existing library
- [x] Migration scripts stored in version control
- [x] Migrations run automatically on startup
- [x] Schema version tracked in database
- [x] Support for rollback migrations
- [x] Idempotent migrations (safe to run multiple times)

### Data Access Layer
- [x] Create database abstraction layer
- [x] Implement connection pooling (SQLite uses WAL)
- [x] Add transaction support (withTransaction helper)
- [x] Create query builder or repository pattern (services)
- [x] Implement error handling and logging (DatabaseError)

## Technical Notes

### Implemented Structure
```
server/src/
├── db/
│   ├── client.ts       # Database connection with retry
│   ├── schema.ts       # SQL schema definitions
│   ├── migrations.ts   # Migration system with rollback
│   ├── index.ts        # Exports
│   └── schema.test.ts  # Schema tests
├── services/
│   ├── lists.ts        # Lists CRUD
│   ├── sections.ts     # Sections CRUD
│   ├── items.ts        # Items CRUD + history
│   ├── sessions.ts     # Session management
│   ├── rate-limits.ts  # Rate limiting
│   └── templates.ts    # Templates CRUD
```

### Test Coverage
- 119 tests passing across 10 test files
- Tests cover: schema creation, foreign keys, migrations, all services

## Dependencies

- Story 1: Project Setup ✅

## Definition of Done

- [x] Database connects successfully on startup
- [x] All tables created with proper constraints
- [x] Migrations run automatically
- [x] Can perform basic CRUD operations
- [x] Schema is documented (in schema.ts comments)
- [x] Tests verify schema creation (119 tests passing)
