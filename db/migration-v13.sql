-- Migration v13: Add outlet code for auto nota number generation
-- Safe migration: adds nullable column, no data modification

-- Add code column to outlets table (nullable for backward compatibility)
ALTER TABLE outlets ADD COLUMN code TEXT;

-- Create unique index for outlet codes (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_outlets_code ON outlets(code) WHERE code IS NOT NULL;

-- Note: Auto-populate existing outlets will be done via application code
-- Admin can then review and adjust codes via the outlet management UI
