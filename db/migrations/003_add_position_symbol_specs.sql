-- Add symbol specification columns to positions for restart-resilient SL/TP
-- money estimates and per-position margin tracking.
ALTER TABLE positions ADD COLUMN IF NOT EXISTS tick_size NUMERIC(20, 10);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS tick_value NUMERIC(20, 10);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS margin NUMERIC(20, 2);
