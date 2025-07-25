-- Phase 1: Fix Database Schema Issues (Final Corrected Version)

-- 1. Add foreign key relationship between trial_balance_entries and schedule3_mapping
-- The schedule3_mapping.id is integer type, so we need to match that
ALTER TABLE trial_balance_entries 
ADD COLUMN IF NOT EXISTS mapping_id INTEGER REFERENCES schedule3_mapping(id);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_mapping_id ON trial_balance_entries(mapping_id);

-- 2. Populate the mapping_id column based on ledger_name matching
UPDATE trial_balance_entries 
SET mapping_id = sm.id
FROM schedule3_mapping sm
WHERE trial_balance_entries.ledger_name = sm.tally_ledger_name
AND trial_balance_entries.mapping_id IS NULL;

-- 3. Create materialized view for better performance on balance sheet queries
CREATE MATERIALIZED VIEW IF NOT EXISTS balance_sheet_view AS
SELECT 
  tbe.id,
  tbe.ledger_name,
  tbe.debit,
  tbe.credit,
  tbe.period_id,
  tbe.mapping_id,
  sm.tally_ledger_name,
  smi.schedule3_item as item_code,
  smi.schedule3_item as item_name,
  smi.report_section as category,
  smi.report_sub_section as sub_category,
  smi.report_type,
  CASE 
    WHEN smi.report_section ILIKE '%ASSET%' THEN (COALESCE(tbe.debit, 0) - COALESCE(tbe.credit, 0))
    WHEN smi.report_section ILIKE '%LIABILITY%' OR smi.report_section ILIKE '%EQUITY%' THEN (COALESCE(tbe.credit, 0) - COALESCE(tbe.debit, 0))
    ELSE (COALESCE(tbe.debit, 0) - COALESCE(tbe.credit, 0))
  END as net_amount
FROM trial_balance_entries tbe
LEFT JOIN schedule3_mapping sm ON tbe.mapping_id = sm.id
LEFT JOIN schedule3_master_items smi ON sm.master_item_id = smi.id
WHERE smi.report_type = 'BALANCE_SHEET'
  AND sm.id IS NOT NULL;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_balance_sheet_view_period_category ON balance_sheet_view(period_id, category);
CREATE INDEX IF NOT EXISTS idx_balance_sheet_view_item_code ON balance_sheet_view(item_code);

-- 4. Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_balance_sheet_view()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW balance_sheet_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to auto-refresh the view when data changes
CREATE OR REPLACE FUNCTION trigger_refresh_balance_sheet_view()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_balance_sheet_view();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_trial_balance_change ON trial_balance_entries;
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_mapping_change ON schedule3_mapping;

-- Create triggers
CREATE TRIGGER refresh_balance_sheet_on_trial_balance_change
  AFTER INSERT OR UPDATE OR DELETE ON trial_balance_entries
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_balance_sheet_view();

CREATE TRIGGER refresh_balance_sheet_on_mapping_change
  AFTER INSERT OR UPDATE OR DELETE ON schedule3_mapping
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_balance_sheet_view();

-- 6. Initial refresh of the materialized view
SELECT refresh_balance_sheet_view();