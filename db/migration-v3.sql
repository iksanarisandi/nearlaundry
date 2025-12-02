-- Migration v3: Add join_date for payroll allowance calculation

-- Add join_date column to users table for tenure-based allowance calculation
ALTER TABLE users ADD COLUMN join_date TEXT;

-- Add denda_terlambat column to payroll table for late penalty tracking
ALTER TABLE payroll ADD COLUMN denda_terlambat INTEGER NOT NULL DEFAULT 0;
