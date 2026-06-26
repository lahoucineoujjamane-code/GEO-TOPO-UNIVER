-- GeoTopo Pro — Cloudflare D1 Schema
-- Migration 0001: Initial schema

-- ── USERS ──
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- UUID v4
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  password_hash TEXT NOT NULL,          -- bcrypt-like (PBKDF2 in Worker)
  salt        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free', -- free | credit | annual
  plan_expires_at TEXT,                 -- ISO datetime or NULL
  trial_ends_at   TEXT NOT NULL,        -- ISO datetime
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_login  TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  reset_token TEXT,
  reset_token_expires TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset ON users(reset_token);

-- ── SESSIONS ──
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,          -- UUID v4
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,      -- SHA-256 of bearer token
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);

-- ── PROJECTS ──
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  crs         TEXT NOT NULL DEFAULT 'EPSG:4326',
  base_map    TEXT NOT NULL DEFAULT 'osm',
  center_lat  REAL,
  center_lon  REAL,
  zoom        INTEGER DEFAULT 12,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_opened TEXT,
  is_public   INTEGER NOT NULL DEFAULT 0,
  thumbnail   TEXT  -- R2 key for thumbnail PNG
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

-- ── LAYERS ──
CREATE TABLE IF NOT EXISTS layers (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- geojson | kml | gpx | dxf | contour | gps
  r2_key      TEXT,           -- R2 storage key (if file stored)
  geojson     TEXT,           -- inline GeoJSON for small layers (<100KB)
  style       TEXT,           -- JSON: color, weight, opacity, etc.
  visible     INTEGER NOT NULL DEFAULT 1,
  z_index     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  meta        TEXT            -- JSON: extra metadata (bbox, feature count...)
);

CREATE INDEX IF NOT EXISTS idx_layers_project ON layers(project_id);
CREATE INDEX IF NOT EXISTS idx_layers_user    ON layers(user_id);
