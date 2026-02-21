export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

-- Shopping Lists
CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sections
CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Item History
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    section_name TEXT,
    description TEXT,
    quantity TEXT,
    frequency INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template Items
CREATE TABLE IF NOT EXISTS template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    section_name TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_until DATETIME
);
`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sections_list_id ON sections(list_id);
CREATE INDEX IF NOT EXISTS idx_items_section_id ON items(section_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_lists_is_active ON lists(is_active);
`;
