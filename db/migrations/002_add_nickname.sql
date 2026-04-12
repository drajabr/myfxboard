-- Add nickname column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT '';
