-- Migration v12: Production Audit Feature
-- Adds verification status and edit history tracking for production entries
-- SAFE: Only ADD COLUMN and CREATE TABLE - no data deletion

-- ============================================
-- 1. Add verification columns to production table
-- ============================================

-- Verification status: 'verified' or 'unverified' (default)
ALTER TABLE production ADD COLUMN verified_status TEXT DEFAULT 'unverified';

-- Admin who verified/unverified the nota
ALTER TABLE production ADD COLUMN verified_by INTEGER REFERENCES users(id);

-- Timestamp when verification status was last changed
ALTER TABLE production ADD COLUMN verified_at TEXT;

-- Admin who edited this entry (locks staff from editing)
ALTER TABLE production ADD COLUMN edited_by_admin INTEGER REFERENCES users(id);

-- ============================================
-- 2. Create production edit history table
-- ============================================

CREATE TABLE IF NOT EXISTS production_edit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  production_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (production_id) REFERENCES production(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Index for faster history lookups by production_id
CREATE INDEX IF NOT EXISTS idx_production_edit_history_production_id 
  ON production_edit_history(production_id);

-- ============================================
-- 3. Verification
-- ============================================
-- Run this query to verify migration was successful:
-- SELECT sql FROM sqlite_master WHERE name = 'production';
-- SELECT sql FROM sqlite_master WHERE name = 'production_edit_history';
