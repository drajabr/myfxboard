-- Persist account balance in accounts row for historical/account-state recovery.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS balance NUMERIC(20, 2);
