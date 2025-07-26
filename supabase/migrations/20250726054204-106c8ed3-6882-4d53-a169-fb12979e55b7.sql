-- Phase 1: Fix Database Constraints & Relationships

-- 1. Make trial_balance_entries.mapping_id nullable and add ON DELETE SET NULL
ALTER TABLE trial_balance_entries 
DROP CONSTRAINT IF EXISTS trial_balance_entries_mapping_id_fkey;

ALTER TABLE trial_balance_entries 
ALTER COLUMN mapping_id DROP NOT NULL;

ALTER TABLE trial_balance_entries 
ADD CONSTRAINT trial_balance_entries_mapping_id_fkey 
FOREIGN KEY (mapping_id) REFERENCES schedule3_mapping(id) ON DELETE SET NULL;

-- 2. Fix schedule3_master_items unique constraint for proper upserts (using correct column names)
DROP INDEX IF EXISTS schedule3_master_items_unique_item_report;
CREATE UNIQUE INDEX schedule3_master_items_unique_item_report 
ON schedule3_master_items (schedule3_item, report_section);

-- 3. Add proper cascade for financial_periods
ALTER TABLE schedule3_mapping 
DROP CONSTRAINT IF EXISTS schedule3_mapping_period_id_fkey;

ALTER TABLE schedule3_mapping 
ADD CONSTRAINT schedule3_mapping_period_id_fkey 
FOREIGN KEY (period_id) REFERENCES financial_periods(id) ON DELETE CASCADE;

-- 4. Fix trial_balance_entries period relationship  
ALTER TABLE trial_balance_entries 
DROP CONSTRAINT IF EXISTS trial_balance_entries_period_id_fkey;

ALTER TABLE trial_balance_entries 
ADD CONSTRAINT trial_balance_entries_period_id_fkey 
FOREIGN KEY (period_id) REFERENCES financial_periods(id) ON DELETE CASCADE;