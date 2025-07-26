-- Drop and recreate the get_mapping_statistics function with correct return type
DROP FUNCTION IF EXISTS get_mapping_statistics();

CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE(
  total_accounts BIGINT,
  mapped_accounts BIGINT,
  completion_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT tb.ledger_name) as total_count,
      COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN tb.ledger_name END) as mapped_count
    FROM trial_balance_entries tb
    LEFT JOIN schedule3_mapping m ON m.tally_ledger_name = tb.ledger_name
    WHERE tb.period_id IN (
      SELECT id FROM financial_periods 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  )
  SELECT 
    stats.total_count as total_accounts,
    stats.mapped_count as mapped_accounts,
    CASE 
      WHEN stats.total_count = 0 THEN 0
      ELSE ROUND((stats.mapped_count::numeric / stats.total_count::numeric) * 100, 2)
    END as completion_percentage
  FROM stats;
END;
$$;