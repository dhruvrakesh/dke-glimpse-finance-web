-- Create the missing get_mapping_statistics function for mapping progress tracking

CREATE OR REPLACE FUNCTION public.get_mapping_statistics()
RETURNS TABLE (
  total_accounts INT,
  mapped_accounts INT,
  completion_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_period_id INT;
BEGIN
  -- Get the latest financial period
  SELECT id INTO latest_period_id
  FROM financial_periods
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no period exists, return zeros
  IF latest_period_id IS NULL THEN
    RETURN QUERY SELECT 0::INT, 0::INT, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate mapping statistics for the latest period
  RETURN QUERY
  WITH trial_balance_count AS (
    SELECT COUNT(DISTINCT ledger_name) as total
    FROM trial_balance_entries 
    WHERE period_id = latest_period_id
  ),
  mapped_count AS (
    SELECT COUNT(DISTINCT tally_ledger_name) as mapped
    FROM schedule3_mapping 
    WHERE period_id = latest_period_id
  )
  SELECT 
    tbc.total,
    mc.mapped,
    CASE 
      WHEN tbc.total = 0 THEN 0::NUMERIC
      ELSE ROUND((mc.mapped::NUMERIC / tbc.total::NUMERIC) * 100, 2)
    END as completion_percentage
  FROM trial_balance_count tbc
  CROSS JOIN mapped_count mc;
END;
$$;