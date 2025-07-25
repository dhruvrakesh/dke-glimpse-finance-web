-- Critical Database Fixes

-- 1. Add a computed column for end_date to maintain backward compatibility
ALTER TABLE financial_periods 
ADD COLUMN end_date date GENERATED ALWAYS AS (quarter_end_date) STORED;

-- 2. Update schedule3_mapping to link unmapped entries with the most recent period
-- First, get the most recent period ID
WITH recent_period AS (
  SELECT id FROM financial_periods 
  ORDER BY quarter_end_date DESC 
  LIMIT 1
)
UPDATE schedule3_mapping 
SET period_id = (SELECT id FROM recent_period)
WHERE period_id IS NULL;

-- 3. Make period_id NOT NULL to prevent future orphaned mappings
ALTER TABLE schedule3_mapping 
ALTER COLUMN period_id SET NOT NULL;

-- 4. Add constraint to ensure all mappings are linked to valid periods
ALTER TABLE schedule3_mapping 
ADD CONSTRAINT fk_schedule3_mapping_period 
FOREIGN KEY (period_id) REFERENCES financial_periods(id) ON DELETE CASCADE;

-- 5. Create index for better performance on period lookups
CREATE INDEX IF NOT EXISTS idx_schedule3_mapping_period_id 
ON schedule3_mapping(period_id);

-- 6. Add function to handle mapping data validation
CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE (
  total_accounts bigint,
  mapped_accounts bigint,
  completion_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH mapping_stats AS (
    SELECT 
      COUNT(DISTINCT tbe.ledger_name) as total_ledgers,
      COUNT(DISTINCT CASE WHEN sm.id IS NOT NULL THEN tbe.ledger_name END) as mapped_ledgers
    FROM trial_balance_entries tbe
    LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name
    WHERE tbe.period_id = (
      SELECT id FROM financial_periods 
      ORDER BY quarter_end_date DESC 
      LIMIT 1
    )
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