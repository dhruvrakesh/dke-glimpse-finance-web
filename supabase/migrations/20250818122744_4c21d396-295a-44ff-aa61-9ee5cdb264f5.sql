-- Complete Phase 1: Fix Database Schema and Ensure Clean State

-- Step 1: Add missing upload_id column to trial_balance_entries if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trial_balance_entries' 
                  AND column_name = 'upload_id') THEN
        ALTER TABLE trial_balance_entries 
        ADD COLUMN upload_id UUID REFERENCES trial_balance_uploads(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_upload_id 
        ON trial_balance_entries(upload_id);
    END IF;
END $$;

-- Step 2: Add missing columns to trial_balance_uploads if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trial_balance_uploads' 
                  AND column_name = 'detected_period') THEN
        ALTER TABLE trial_balance_uploads 
        ADD COLUMN detected_period TEXT,
        ADD COLUMN period_confidence NUMERIC DEFAULT 0,
        ADD COLUMN processed_entries_count INTEGER DEFAULT 0,
        ADD COLUMN failed_entries_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 3: Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_period_id 
ON trial_balance_entries(period_id);

CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_upload_status 
ON trial_balance_uploads(upload_status);

CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_quarter_end_date 
ON trial_balance_uploads(quarter_end_date);

-- Step 4: Add unique constraint to prevent duplicate entries per upload
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'unique_upload_ledger') THEN
        ALTER TABLE trial_balance_entries 
        ADD CONSTRAINT unique_upload_ledger 
        UNIQUE (upload_id, ledger_name);
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- Constraint already exists, ignore
    NULL;
END $$;