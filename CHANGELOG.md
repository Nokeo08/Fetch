# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-01

### Added
- Shopping list CRUD with sections and items
- Real-time synchronization via WebSocket
- Offline support with IndexedDB and operation queue
- Progressive Web App (PWA) with service worker
- Single-password authentication with session cookies
- Bearer token authentication for API access
- Reusable templates with section-aware application
- Item history with fuzzy search autocomplete suggestions
- Data import/export (JSON format, merge or replace modes)
- Internationalization with 13 language translations
- Rate limiting on login attempts (5 attempts / 15 min, 30 min lockout)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- CORS support with configurable origins
- Request logging with unique request IDs
- Health check endpoint with database status
- Docker deployment with multi-stage build
- Docker Compose configuration with production overlay
- SQLite database with schema migrations
- Item states: active, completed, uncertain
- Drag-and-drop reordering for lists, sections, and items
- Case-insensitive unique list names
- Comprehensive API with 40+ endpoints

[Unreleased]: https://github.com/Nokeo08/Fetch/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Nokeo08/Fetch/releases/tag/v0.1.0
