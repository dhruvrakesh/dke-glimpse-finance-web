-- Drop the materialized view properly
DROP MATERIALIZED VIEW IF EXISTS balance_sheet_view CASCADE;

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