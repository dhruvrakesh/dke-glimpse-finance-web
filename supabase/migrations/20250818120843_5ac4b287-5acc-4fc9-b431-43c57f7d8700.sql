-- Step 1: Clear existing problematic data
DELETE FROM trial_balance_entries WHERE period_id = 5;
DELETE FROM trial_balance_uploads WHERE id IN ('abfb715a-603b-47a6-b4f5-b452be764b91', 'a7c123ec-45d6-789e-bcde-f123456789ab');
DELETE FROM financial_periods WHERE id = 5;

-- Step 2: Add missing upload_id column to trial_balance_entries
ALTER TABLE trial_balance_entries 
ADD COLUMN upload_id UUID REFERENCES trial_balance_uploads(id) ON DELETE CASCADE;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_upload_id ON trial_balance_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_period_id ON trial_balance_entries(period_id);

-- Step 4: Add any missing columns that were mentioned in the edge function
ALTER TABLE trial_balance_uploads 
ADD COLUMN IF NOT EXISTS detected_period TEXT,
ADD COLUMN IF NOT EXISTS period_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_entries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_entries_count INTEGER DEFAULT 0;