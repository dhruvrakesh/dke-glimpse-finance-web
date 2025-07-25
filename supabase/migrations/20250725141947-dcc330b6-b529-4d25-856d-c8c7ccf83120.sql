-- Fix the security warnings for the balance_sheet_view materialized view
-- Add RLS policies for the materialized view

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW balance_sheet_view ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users to access balance sheet view
CREATE POLICY "Authenticated users can access balance sheet view" 
ON balance_sheet_view 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Fix the function search path for our custom functions
ALTER FUNCTION refresh_balance_sheet_view() SET search_path TO 'public';
ALTER FUNCTION trigger_refresh_balance_sheet_view() SET search_path TO 'public';