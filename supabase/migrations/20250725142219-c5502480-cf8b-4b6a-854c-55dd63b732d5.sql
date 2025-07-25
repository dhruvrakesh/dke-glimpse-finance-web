-- Drop the materialized view and create a regular view instead
-- Regular views can have RLS policies

DROP MATERIALIZED VIEW IF EXISTS balance_sheet_view;

-- Drop the functions and triggers related to the materialized view
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_trial_balance_change ON trial_balance_entries;
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_mapping_change ON schedule3_mapping;
DROP FUNCTION IF EXISTS trigger_refresh_balance_sheet_view();
DROP FUNCTION IF EXISTS refresh_balance_sheet_view();

-- Create a regular view instead
CREATE VIEW balance_sheet_view AS
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

-- Enable RLS on the view
ALTER VIEW balance_sheet_view SET (security_invoker = true);

-- Create RLS policy for authenticated users to access balance sheet view  
CREATE POLICY "Authenticated users can access balance sheet view" 
ON balance_sheet_view 
FOR SELECT 
USING (auth.role() = 'authenticated');