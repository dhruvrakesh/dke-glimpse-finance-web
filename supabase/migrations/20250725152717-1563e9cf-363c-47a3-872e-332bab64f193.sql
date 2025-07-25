-- Critical Database Fixes (Simplified)

-- 1. Add end_date as alias column for backward compatibility
ALTER TABLE financial_periods 
ADD COLUMN end_date date;

-- Update end_date to match quarter_end_date for existing records
UPDATE financial_periods 
SET end_date = quarter_end_date 
WHERE end_date IS NULL;

-- 2. Update schedule3_mapping to link unmapped entries with the most recent period
UPDATE schedule3_mapping 
SET period_id = (
  SELECT id FROM financial_periods 
  ORDER BY quarter_end_date DESC 
  LIMIT 1
)
WHERE period_id IS NULL;

-- 3. Make period_id NOT NULL to prevent future orphaned mappings
ALTER TABLE schedule3_mapping 
ALTER COLUMN period_id SET NOT NULL;

-- 4. Create function to get mapping statistics without RLS conflicts
CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE (
  total_accounts bigint,
  mapped_accounts bigint,
  completion_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_period AS (
    SELECT id FROM financial_periods 
    ORDER BY quarter_end_date DESC 
    LIMIT 1
  ),
  mapping_stats AS (
    SELECT 
      COUNT(DISTINCT tbe.ledger_name) as total_ledgers,
      COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END) as mapped_ledgers
    FROM trial_balance_entries tbe
    LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name
    WHERE tbe.period_id = (SELECT id FROM recent_period)
  )
  SELECT 
    total_ledgers,
    mapped_ledgers,
    CASE 
      WHEN total_ledgers > 0 THEN ROUND((mapped_ledgers::numeric / total_ledgers::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM mapping_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;