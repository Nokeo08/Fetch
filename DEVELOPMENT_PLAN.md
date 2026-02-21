# Fetch Development Plan

> Technology-agnostic specification for a self-hosted shopping list application

## Project Overview

**Fetch** is a lightweight, self-hosted Progressive Web App (PWA) for managing shopping lists with real-time synchronization across devices. The app is designed for couples and families who want a simple, privacy-focused solution for shared shopping lists.

### Core Principles
- **Simplicity**: Single password, no complex registration
- **Privacy**: Self-hosted, data stays with the user
- **Speed**: Real-time sync, offline support
- **Accessibility**: Works on all devices, multi-language support

---

## 1. Architecture & Infrastructure

### 1.1 System Requirements

**Application Characteristics:**
- Single deployable unit (binary, container, or package)
- Lightweight resource footprint
- Embeddable static assets
- Cross-platform compatibility

**Data Layer:**
- Embedded or file-based database
- Schema migration support
- Connection pooling and transaction support

**Frontend:**
- Progressive Web App capabilities
- Responsive design framework
- Real-time communication support
- Offline storage mechanisms

### 1.2 Acceptance Criteria

- [ ] Application deploys as a single unit
- [ ] Container image builds successfully
- [ ] Embedded database with write-ahead logging or equivalent
- [ ] All static assets bundled with application
- [ ] Memory usage < 50 MB at idle
- [ ] Application starts in < 5 seconds
- [ ] Health check endpoint at `/health`
- [ ] Graceful shutdown handling

---

## 2. Authentication & Security

### 2.1 Single Password Authentication

**Description:** Simple authentication system using a single configurable password. No user registration or management required.

#### Acceptance Criteria

- [ ] Login page accepts single password field
- [ ] Password configurable via environment variable
- [ ] Session-based authentication with secure cookies
- [ ] Session expires after 7 days of inactivity
- [ ] Option to disable auth for reverse proxy setups
- [ ] Failed login attempts return generic error message (no user enumeration)

### 2.2 Rate Limiting

**Description:** Protection against brute force attacks on the login endpoint.

#### Acceptance Criteria

- [ ] Maximum 5 failed attempts per 15 minutes per IP
- [ ] After 5 failures, account locks for 30 minutes
- [ ] Rate limit data persists across restarts
- [ ] Rate limit counter resets after successful login
- [ ] Returns 429 status code when rate limited

### 2.3 Session Management

**Description:** Secure session handling with cleanup.

#### Acceptance Criteria

- [ ] Sessions stored persistently
- [ ] Session token is cryptographically random (32+ bytes)
- [ ] Secure cookie attributes (HttpOnly, Secure, SameSite)
- [ ] Automatic cleanup of expired sessions on startup
- [ ] Logout endpoint clears session cookie and session store

---

## 3. Database Layer

### 3.1 Database Schema

**Description:** Persistent storage with proper schema design for shopping lists, items, sections, and history.

#### Tables Required

1. **sessions** - User sessions
2. **lists** - Shopping lists
3. **sections** - List sections (e.g., Dairy, Produce)
4. **items** - Shopping items
5. **history** - Item history for suggestions
6. **templates** - Reusable list templates
7. **template_items** - Items within templates
8. **rate_limits** - Rate limiting data

#### Acceptance Criteria

- [ ] Database auto-migrates on startup
- [ ] Schema version tracked in database
- [ ] Foreign key constraints enforced
- [ ] Indexes on frequently queried columns
- [ ] Database created automatically if not exists
- [ ] Concurrent access support
- [ ] Appropriate busy timeout or lock handling

### 3.2 Query Layer

**Description:** Centralized data access with proper error handling.

#### Acceptance Criteria

- [ ] All queries in single location or layer
- [ ] Prepared statements or parameterized queries for frequently used operations
- [ ] Context/cancellation support for long-running queries
- [ ] Proper error wrapping with context
- [ ] Transaction support for multi-table operations
- [ ] Connection pooling with appropriate limits

---

## 4. Shopping Lists

### 4.1 List Management

**Description:** CRUD operations for shopping lists with custom icons and sorting.

#### Acceptance Criteria

**Create:**
- [ ] Create list with name and optional emoji icon
- [ ] Name required (1-100 characters)
- [ ] Default icon if none provided
- [ ] New list becomes active automatically

**Read:**
- [ ] List all lists with item counts
- [ ] Display active status
- [ ] Sortable order maintained per user

**Update:**
- [ ] Edit list name and icon
- [ ] Reorder lists via drag-and-drop
- [ ] Set list as active
- [ ] Persist order in database

**Delete:**
- [ ] Delete list with confirmation
- [ ] Cascade delete all sections and items
- [ ] Cannot delete last remaining list

### 4.2 Active List

**Description:** Single active list per session for quick access.

#### Acceptance Criteria

- [ ] Only one active list at a time
- [ ] Active list persists across sessions
- [ ] Default to first list if none active
- [ ] Quick switch between lists
- [ ] Active list highlighted in UI

---

## 5. Sections

### 5.1 Section Management

**Description:** Organize items into sections for store navigation.

#### Acceptance Criteria

**Create:**
- [ ] Add section with name
- [ ] Name required (1-100 characters)
- [ ] Sections ordered within list
- [ ] Optional: assign color or icon

**Read:**
- [ ] Display sections in order
- [ ] Show item count per section
- [ ] Collapsible sections

**Update:**
- [ ] Edit section name
- [ ] Reorder sections via drag-and-drop
- [ ] Move items between sections
- [ ] Persist order in database

**Delete:**
- [ ] Delete empty section immediately
- [ ] Delete section with items shows confirmation
- [ ] Option to move items to another section or delete all
- [ ] Batch delete multiple sections

---

## 6. Items

### 6.1 Item Management

**Description:** Core functionality for managing shopping items.

#### Acceptance Criteria

**Create:**
- [ ] Add item with name (required, 1-200 characters)
- [ ] Optional: description, quantity
- [ ] Optional: assign to section
- [ ] Auto-suggest section based on history
- [ ] Quick-add from suggestions

**Read:**
- [ ] Display items grouped by section
- [ ] Show name, description, quantity
- [ ] Visual indicator for status
- [ ] Sort by creation date or manual order

**Update:**
- [ ] Edit item details inline
- [ ] Toggle completed status
- [ ] Mark as "uncertain" (can't find item)
- [ ] Move item between sections
- [ ] Reorder items within section (drag-and-drop)

**Delete:**
- [ ] Delete single item with confirmation
- [ ] Batch delete completed items
- [ ] Soft delete (keep in history)

### 6.2 Item States

**Description:** Multiple states for items to track shopping progress.

#### Acceptance Criteria

**Active:**
- [ ] Default state for new items
- [ ] Visible in main list
- [ ] Can be edited

**Completed:**
- [ ] Strikethrough visual
- [ ] Moved to bottom of section
- [ ] Batch clear all completed
- [ ] Toggle back to active

**Uncertain:**
- [ ] Question mark or special indicator
- [ ] Different visual from completed
- [ ] Can be toggled to completed or active

---

## 7. Templates

### 7.1 Template Management

**Description:** Reusable templates for common shopping patterns.

#### Acceptance Criteria

**Create:**
- [ ] Create template from scratch
- [ ] Create template from existing list
- [ ] Name required (1-100 characters)
- [ ] Add items to template

**Read:**
- [ ] List all templates
- [ ] Preview template contents
- [ ] Show item count

**Update:**
- [ ] Edit template name
- [ ] Add/remove items from template
- [ ] Reorder items

**Delete:**
- [ ] Delete template with confirmation

### 7.2 Apply Templates

**Description:** Add template items to a shopping list.

#### Acceptance Criteria

- [ ] Apply template to current list
- [ ] Skip items already in list (by name)
- [ ] Preserve section assignments if possible
- [ ] Show preview before applying
- [ ] Option to select which items to add

---

## 8. Real-Time Synchronization

### 8.1 WebSocket / Server-Sent Events Implementation

**Description:** Real-time updates across all connected clients.

#### Acceptance Criteria

- [ ] Real-time endpoint at `/ws` or `/events`
- [ ] Authenticate connections via session
- [ ] Broadcast all changes to connected clients
- [ ] Handle connection drops gracefully
- [ ] Keepalive mechanism (ping/pong or heartbeat)
- [ ] Connection timeout after missed keepalives
- [ ] Maximum concurrent connections per user

### 8.2 Update Broadcasting

**Description:** Push changes to all clients immediately.

#### Acceptance Criteria

- [ ] Item created → broadcast to all clients
- [ ] Item updated → broadcast changes
- [ ] Item deleted → broadcast removal
- [ ] Item moved → broadcast new position
- [ ] Section changes → broadcast updates
- [ ] List changes → broadcast updates
- [ ] Include timestamp for conflict resolution
- [ ] Client acknowledges receipt

### 8.3 Conflict Resolution

**Description:** Handle concurrent edits from multiple clients.

#### Acceptance Criteria

- [ ] Last-write-wins for most fields
- [ ] Append-only for lists/sections
- [ ] Version numbers or timestamps on entities
- [ ] Client reconciles server state on reconnect
- [ ] Visual indicator for sync status

---

## 9. Offline Mode

### 9.1 Service Worker

**Description:** PWA functionality with offline support.

#### Acceptance Criteria

- [ ] Register service worker
- [ ] Cache static assets for offline use
- [ ] Cache app shell
- [ ] Background sync for queued operations
- [ ] Show offline indicator in UI

### 9.2 Offline Storage

**Description:** Local storage for offline data access.

#### Acceptance Criteria

- [ ] Store current list data locally
- [ ] Queue operations while offline
- [ ] Show pending operations count
- [ ] Auto-sync when connection restored
- [ ] Handle sync conflicts
- [ ] Retry failed operations with exponential backoff
- [ ] Clear queue after successful sync

### 9.3 Offline UI

**Description:** User experience while offline.

#### Acceptance Criteria

- [ ] Offline banner when disconnected
- [ ] Allow creating/editing items offline
- [ ] Show sync pending indicator
- [ ] Disable features requiring connection (import/export)
- [ ] Reconnect automatically when possible

---

## 10. Auto-Completion & Suggestions

### 10.1 Item History

**Description:** Remember previously added items for quick re-add.

#### Acceptance Criteria

- [ ] Store every unique item name in history
- [ ] Track frequency of use
- [ ] Remember last section for each item
- [ ] Remember last description/quantity
- [ ] Update history on item creation

### 10.2 Search Suggestions

**Description:** Fuzzy search for item suggestions.

#### Acceptance Criteria

- [ ] Search while typing in item name field
- [ ] Fuzzy matching algorithm (Jaro, Levenshtein, or similar)
- [ ] Character normalization for special characters
- [ ] Show top 5 matches
- [ ] Display with last used section
- [ ] Click to auto-fill name and section
- [ ] Keyboard navigation (up/down arrows, enter)

---

## 11. Import & Export

### 11.1 Data Export

**Description:** Export data for backup or migration.

#### Acceptance Criteria

**Export All:**
- [ ] Export all lists, sections, items, templates, history
- [ ] JSON format (structured data)
- [ ] CSV format (flat data)
- [ ] Include metadata (export date, app version)
- [ ] Download as file

**Export Single List:**
- [ ] Export specific list only
- [ ] Include sections and items
- [ ] JSON and CSV formats

### 11.2 Data Import

**Description:** Import data from backups or other sources.

#### Acceptance Criteria

- [ ] Accept JSON format
- [ ] Preview import before applying
- [ ] Show item counts to be imported
- [ ] Option to merge or replace existing data
- [ ] Validate data structure
- [ ] Show errors for invalid data
- [ ] Transactional import (all or nothing)
- [ ] Progress indicator for large imports

---

## 12. REST API

### 12.1 API Authentication

**Description:** Token-based authentication for API access.

#### Acceptance Criteria

- [ ] API token configurable via environment variable
- [ ] Token passed in `Authorization: Bearer <token>` header
- [ ] Return 401 for missing/invalid token
- [ ] Separate from session-based web auth

### 12.2 API Endpoints

**Description:** Complete REST API for external integrations.

#### Base URL: `/api/v1`

**Lists:**
- [ ] `GET /lists` - List all lists
- [ ] `GET /lists/:id` - Get single list
- [ ] `POST /lists` - Create list
- [ ] `PUT /lists/:id` - Update list
- [ ] `DELETE /lists/:id` - Delete list
- [ ] `POST /lists/:id/reorder` - Reorder lists

**Sections:**
- [ ] `GET /lists/:id/sections` - List sections
- [ ] `GET /sections/:id` - Get single section
- [ ] `POST /lists/:id/sections` - Create section
- [ ] `PUT /sections/:id` - Update section
- [ ] `DELETE /sections/:id` - Delete section
- [ ] `POST /sections/:id/reorder` - Reorder sections

**Items:**
- [ ] `GET /sections/:id/items` - List items in section
- [ ] `GET /items/:id` - Get single item
- [ ] `POST /sections/:id/items` - Create item
- [ ] `PUT /items/:id` - Update item
- [ ] `DELETE /items/:id` - Delete item
- [ ] `POST /items/:id/move` - Move item to section
- [ ] `POST /items/:id/reorder` - Reorder items

**History:**
- [ ] `GET /history` - Get item history
- [ ] `DELETE /history/:id` - Delete history entry

**Templates:**
- [ ] `GET /templates` - List templates
- [ ] `GET /templates/:id` - Get template
- [ ] `POST /templates` - Create template
- [ ] `PUT /templates/:id` - Update template
- [ ] `DELETE /templates/:id` - Delete template
- [ ] `POST /templates/:id/apply` - Apply to list

**Batch Operations:**
- [ ] `POST /batch` - Execute multiple operations atomically

### 12.3 API Response Format

**Description:** Consistent JSON response format.

#### Acceptance Criteria

- [ ] Success: `{ "success": true, "data": ... }`
- [ ] Error: `{ "success": false, "error": "message" }`
- [ ] Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- [ ] Content-Type: application/json
- [ ] Pagination for large lists (optional)

---

## 13. Internationalization (i18n)

### 13.1 Translation System

**Description:** Multi-language support.

#### Acceptance Criteria

- [ ] Support for multiple languages:
  - English (en)
  - Polish (pl)
  - German (de)
  - Spanish (es)
  - French (fr)
  - Portuguese (pt)
  - Ukrainian (uk)
  - Norwegian (no)
  - Lithuanian (lt)
  - Greek (el)
  - Slovak (sk)
  - Russian (ru)
  - Swedish (sv)
- [ ] Externalized translation files
- [ ] Parameter substitution support
- [ ] Pluralization support (optional)
- [ ] Fallback to English if translation missing

### 13.2 Language Selection

**Description:** User language preference.

#### Acceptance Criteria

- [ ] Language selector in UI
- [ ] Persist language choice
- [ ] Detect browser language on first visit
- [ ] Language stored in cookie or local storage
- [ ] All UI strings translatable
- [ ] RTL support (if applicable)

---

## 14. User Interface

### 14.1 Progressive Web App

**Description:** PWA capabilities for mobile installation.

#### Acceptance Criteria

- [ ] Valid web app manifest
- [ ] Icons in multiple sizes (48x48 to 512x512)
- [ ] Theme color matches app
- [ ] Standalone display mode
- [ ] Install prompt on mobile
- [ ] Works offline
- [ ] Responsive design

### 14.2 Responsive Design

**Description:** Works on all screen sizes.

#### Acceptance Criteria

- [ ] Mobile-first design
- [ ] Touch-friendly targets (min 44px)
- [ ] Collapsible navigation on mobile
- [ ] Optimized layouts for tablet/desktop
- [ ] No horizontal scroll on mobile
- [ ] Font sizes readable on all devices

### 14.3 UI Components

**Description:** Consistent UI components.

#### Acceptance Criteria

- [ ] Toast notifications for actions
- [ ] Modal dialogs for confirmations
- [ ] Loading states for async operations
- [ ] Empty states for empty lists
- [ ] Error messages with retry options
- [ ] Drag-and-drop visual feedback
- [ ] Keyboard shortcuts documented

---

## 15. Deployment

### 15.1 Container Deployment

**Description:** Container deployment support.

#### Acceptance Criteria

- [ ] Multi-stage container build
- [ ] Final image < 100 MB
- [ ] Non-root user execution
- [ ] Health check endpoint
- [ ] Volume for database persistence
- [ ] Environment variable configuration
- [ ] Compose file provided

### 15.2 Cloud Platforms

**Description:** One-click deployment options.

#### Acceptance Criteria

- [ ] Railway configuration
- [ ] Render configuration
- [ ] Fly.io configuration
- [ ] Heroku configuration
- [ ] DigitalOcean configuration
- [ ] Coolify deployment docs
- [ ] Environment variable templates for each

---

## 16. Testing Strategy

### 16.1 Unit Tests

**Description:** Test individual functions and components.

#### Acceptance Criteria

- [ ] Database layer tests
- [ ] API handler tests
- [ ] Authentication tests
- [ ] Utility function tests
- [ ] > 70% code coverage

### 16.2 Integration Tests

**Description:** Test complete workflows.

#### Acceptance Criteria

- [ ] End-to-end API tests
- [ ] Real-time communication tests
- [ ] Import/export tests
- [ ] Authentication flow tests
- [ ] Rate limiting tests

### 16.3 Performance Tests

**Description:** Ensure performance requirements.

#### Acceptance Criteria

- [ ] Load test: 100 concurrent users
- [ ] Response time < 200ms for 95th percentile
- [ ] Memory usage stable under load
- [ ] Database queries optimized (N+1 check)

---

## 17. Documentation

### 17.1 User Documentation

**Description:** Documentation for end users.

#### Acceptance Criteria

- [ ] README with quick start
- [ ] Deployment guides
- [ ] Environment variable reference
- [ ] FAQ section
- [ ] Troubleshooting guide

### 17.2 API Documentation

**Description:** Documentation for API consumers.

#### Acceptance Criteria

- [ ] OpenAPI/Swagger specification
- [ ] Example requests/responses
- [ ] Authentication guide
- [ ] Error code reference
- [ ] Rate limiting details

---

## 18. Non-Functional Requirements

### 18.1 Performance

- [ ] Page load < 2 seconds on 3G
- [ ] API response < 100ms for simple queries
- [ ] Real-time latency < 50ms
- [ ] Support 1000+ items per list
- [ ] Support 100+ lists

### 18.2 Security

- [ ] XSS protection
- [ ] CSRF protection (if applicable)
- [ ] SQL/NoSQL injection protection
- [ ] Secure headers (CSP, HSTS, X-Frame-Options)
- [ ] No sensitive data in logs
- [ ] Password never stored in plaintext

### 18.3 Accessibility

- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation support
- [ ] Screen reader compatible
- [ ] Color contrast ratios met
- [ ] Focus indicators visible

### 18.4 Browser Support

- [ ] Chrome/Edge (last 2 versions)
- [ ] Firefox (last 2 versions)
- [ ] Safari (last 2 versions)
- [ ] Mobile Safari iOS 14+
- [ ] Chrome Android (last 2 versions)

---

## 19. Development Phases

### Phase 1: Foundation
- [ ] Project setup and architecture
- [ ] Database schema and migrations
- [ ] Basic HTTP server
- [ ] Static file serving
- [ ] Container setup

### Phase 2: Core Features
- [ ] Authentication system
- [ ] List CRUD operations
- [ ] Section management
- [ ] Item management
- [ ] Basic UI

### Phase 3: Advanced Features
- [ ] Templates system
- [ ] Import/export
- [ ] Auto-completion/suggestions
- [ ] Real-time sync
- [ ] Offline mode

### Phase 4: Polish & API
- [ ] REST API
- [ ] i18n implementation
- [ ] PWA features
- [ ] Responsive design
- [ ] Testing

### Phase 5: Deployment & Docs
- [ ] Cloud platform configs
- [ ] Documentation
- [ ] Performance optimization
- [ ] Security audit
- [ ] Release preparation

---

## 20. Success Metrics

- [ ] All acceptance criteria pass
- [ ] Test coverage > 70%
- [ ] Lighthouse score > 90
- [ ] Zero critical security issues
- [ ] Deploys successfully to all target platforms
- [ ] Documentation complete
- [ ] Code review approved

---

## Appendix A: Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PASSWORD` | Yes* | - | Single password for authentication |
| `DISABLE_AUTH` | No | false | Disable auth for reverse proxy setups |
| `API_TOKEN` | No | - | Token for API access |
| `PORT` | No | 3000 | HTTP server port |
| `DATABASE_PATH` | No | ./data/fetch.db | Database file path |
| `SESSION_SECRET` | No | random | Secret for session encryption |

*Required unless DISABLE_AUTH=true

---

## Appendix B: Database Schema

```sql
-- Sessions
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

-- Shopping Lists
CREATE TABLE lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sections
CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items
CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    status TEXT DEFAULT 'active', -- active, completed, uncertain
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Item History
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    section_name TEXT,
    description TEXT,
    quantity TEXT,
    frequency INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Templates
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template Items
CREATE TABLE template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    section_name TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Rate Limiting
CREATE TABLE rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_until DATETIME
);
```
