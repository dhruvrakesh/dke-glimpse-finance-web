-- First, disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS trigger_refresh_balance_sheet_view ON trial_balance_entries;
DROP TRIGGER IF EXISTS trigger_refresh_balance_sheet_view ON schedule3_mapping;

-- Drop the problematic function
DROP FUNCTION IF EXISTS refresh_balance_sheet_view();
DROP FUNCTION IF EXISTS trigger_refresh_balance_sheet_view();

-- Now apply the critical fixes
-- 1. Add end_date column for backward compatibility
ALTER TABLE financial_periods 
ADD COLUMN IF NOT EXISTS end_date date;

-- Update end_date to match quarter_end_date
UPDATE financial_periods 
SET end_date = quarter_end_date 
WHERE end_date IS NULL;

-- 2. Fix orphaned mappings
UPDATE schedule3_mapping 
SET period_id = (
  SELECT id FROM financial_periods 
  ORDER BY quarter_end_date DESC 
  LIMIT 1
)
WHERE period_id IS NULL;

-- 3. Make period_id NOT NULL
ALTER TABLE schedule3_mapping 
ALTER COLUMN period_id SET NOT NULL;

-- 4. Update the mapping statistics function
CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE (
  total_accounts bigint,
  mapped_accounts bigint,
  completion_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(DISTINCT tbe.ledger_name), 0)::bigint as total_accounts,
    COALESCE(COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END), 0)::bigint as mapped_accounts,
    CASE 
      WHEN COUNT(DISTINCT tbe.ledger_name) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END)::numeric / COUNT(DISTINCT tbe.ledger_name)::numeric) * 100, 2)
      ELSE 0::numeric
    END as completion_percentage
  FROM trial_balance_entries tbe
  LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name
  WHERE tbe.period_id = (
    SELECT id FROM financial_periods 
    ORDER BY quarter_end_date DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;