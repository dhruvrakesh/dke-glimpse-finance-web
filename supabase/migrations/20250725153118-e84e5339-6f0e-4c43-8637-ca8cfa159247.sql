-- Drop triggers first, then functions
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_trial_balance_change ON trial_balance_entries;
DROP TRIGGER IF EXISTS refresh_balance_sheet_on_mapping_change ON schedule3_mapping;
DROP FUNCTION IF EXISTS trigger_refresh_balance_sheet_view() CASCADE;
DROP FUNCTION IF EXISTS refresh_balance_sheet_view() CASCADE;

-- Critical Database Fixes
-- 1. Add end_date column for backward compatibility  
ALTER TABLE financial_periods 
ADD COLUMN IF NOT EXISTS end_date date;

-- Update end_date values
UPDATE financial_periods 
SET end_date = quarter_end_date 
WHERE end_date IS NULL;

-- 2. Fix orphaned schedule3_mapping entries
UPDATE schedule3_mapping 
SET period_id = (
  SELECT id FROM financial_periods 
  ORDER BY quarter_end_date DESC 
  LIMIT 1
)
WHERE period_id IS NULL;

-- 3. Make period_id NOT NULL to prevent future issues
ALTER TABLE schedule3_mapping 
ALTER COLUMN period_id SET NOT NULL;

-- 4. Create improved mapping statistics function
CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE (
  total_accounts bigint,
  mapped_accounts bigint,
  completion_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(DISTINCT tbe.ledger_name), 0)::bigint,
    COALESCE(COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END), 0)::bigint,
    CASE 
      WHEN COUNT(DISTINCT tbe.ledger_name) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END)::numeric / COUNT(DISTINCT tbe.ledger_name)::numeric) * 100, 2)
      ELSE 0::numeric
    END
  FROM trial_balance_entries tbe
  LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name
  WHERE tbe.period_id = (
    SELECT id FROM financial_periods 
    ORDER BY quarter_end_date DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;