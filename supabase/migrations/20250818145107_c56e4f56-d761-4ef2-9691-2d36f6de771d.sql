-- Phase 2A: Create proper balance sheet view for financial analysis
DROP VIEW IF EXISTS balance_sheet_view;

CREATE VIEW balance_sheet_view AS
SELECT 
  tbe.id,
  tbe.period_id,
  tbe.ledger_name as item_name,
  tbe.ledger_name as item_code,
  tbe.debit,
  tbe.credit,
  tbe.closing_balance as net_amount,
  tbe.mapping_id,
  tbe.ledger_name as tally_ledger_name,
  CASE 
    WHEN tbe.account_type = 'ASSETS' THEN 'ASSETS'
    WHEN tbe.account_type = 'LIABILITIES' THEN 'LIABILITIES'
    WHEN tbe.account_type = 'EQUITY' THEN 'EQUITY'
    WHEN tbe.account_type = 'REVENUE' THEN 'INCOME'
    WHEN tbe.account_type = 'EXPENSES' THEN 'EXPENSES'
    ELSE tbe.account_type
  END as report_type,
  tbe.account_category as category,
  tbe.account_category as sub_category
FROM trial_balance_entries tbe
WHERE tbe.closing_balance != 0;

-- Update financial_periods to have proper period names
UPDATE financial_periods 
SET period_name = CONCAT('Q', quarter::text, ' ', year::text)
WHERE period_name IS NULL OR period_name = '';

-- Create materiality_settings table for report thresholds
CREATE TABLE IF NOT EXISTS materiality_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_percentage NUMERIC DEFAULT 0.05,
  minimum_amount NUMERIC DEFAULT 100000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default materiality threshold (5% or ₹1 lakh)
INSERT INTO materiality_settings (threshold_percentage, minimum_amount)
VALUES (0.05, 100000)
ON CONFLICT DO NOTHING;