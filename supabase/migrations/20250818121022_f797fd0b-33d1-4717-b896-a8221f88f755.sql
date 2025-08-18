-- Step 1: Clear dependent data first (foreign key constraints)
DELETE FROM gpt_usage_log WHERE upload_id IN ('abfb715a-603b-47a6-b4f5-b452be764b91', 'a7c123ec-45d6-789e-bcde-f123456789ab');

-- Step 2: Clear trial balance entries
DELETE FROM trial_balance_entries WHERE period_id = 5;

-- Step 3: Clear upload records
DELETE FROM trial_balance_uploads WHERE id IN ('abfb715a-603b-47a6-b4f5-b452be764b91', 'a7c123ec-45d6-789e-bcde-f123456789ab');

-- Step 4: Clear financial period
DELETE FROM financial_periods WHERE id = 5;

-- Step 5: Add missing upload_id column to trial_balance_entries
ALTER TABLE trial_balance_entries 
ADD COLUMN upload_id UUID REFERENCES trial_balance_uploads(id) ON DELETE CASCADE;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_upload_id ON trial_balance_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_period_id ON trial_balance_entries(period_id);

-- Step 7: Add missing columns to trial_balance_uploads
ALTER TABLE trial_balance_uploads 
ADD COLUMN IF NOT EXISTS detected_period TEXT,
ADD COLUMN IF NOT EXISTS period_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_entries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_entries_count INTEGER DEFAULT 0;