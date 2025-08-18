-- Step 1: Clear all dependent data in correct order
DELETE FROM gpt_usage_log WHERE upload_id IN (
  SELECT id FROM trial_balance_uploads WHERE period_id = 5
);

DELETE FROM trial_balance_entries WHERE period_id = 5;

DELETE FROM trial_balance_uploads WHERE period_id = 5;

DELETE FROM financial_periods WHERE id = 5;

-- Step 2: Add missing upload_id column to trial_balance_entries
ALTER TABLE trial_balance_entries 
ADD COLUMN upload_id UUID REFERENCES trial_balance_uploads(id) ON DELETE CASCADE;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_upload_id ON trial_balance_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_period_id ON trial_balance_entries(period_id);

-- Step 4: Add missing columns to trial_balance_uploads
ALTER TABLE trial_balance_uploads 
ADD COLUMN IF NOT EXISTS detected_period TEXT,
ADD COLUMN IF NOT EXISTS period_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_entries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_entries_count INTEGER DEFAULT 0;