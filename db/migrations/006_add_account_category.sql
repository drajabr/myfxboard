-- Add category column to accounts table
-- Stores a comma-separated list of user-defined category labels (e.g. "Prop,Live")
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
