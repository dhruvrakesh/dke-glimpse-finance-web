-- Phase 1: Fix Deletion Issues and Data Integrity

-- Create function to safely clean upload data with proper cascade handling
CREATE OR REPLACE FUNCTION public.clean_upload_cascade(upload_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  entries_deleted INTEGER := 0;
  mapping_deleted INTEGER := 0;
BEGIN
  -- Start transaction
  BEGIN
    -- Delete trial balance entries first (children)
    DELETE FROM trial_balance_entries WHERE upload_id = upload_id_param;
    GET DIAGNOSTICS entries_deleted = ROW_COUNT;
    
    -- Delete schedule3 mappings related to this upload
    DELETE FROM schedule3_mapping WHERE trial_balance_entry_id IN (
      SELECT id FROM trial_balance_entries WHERE upload_id = upload_id_param
    );
    GET DIAGNOSTICS mapping_deleted = ROW_COUNT;
    
    -- Finally delete the upload record (parent)
    DELETE FROM trial_balance_uploads WHERE id = upload_id_param;
    
    result := jsonb_build_object(
      'success', true,
      'entries_deleted', entries_deleted,
      'mappings_deleted', mapping_deleted,
      'upload_deleted', true
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'entries_deleted', entries_deleted,
      'mappings_deleted', mapping_deleted
    );
    RETURN result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 2: Enhanced Stock Accounting Structure

-- Create stock movements table for proper inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id INTEGER NOT NULL REFERENCES financial_periods(id),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING_STOCK', 'PURCHASES', 'SALES', 'CLOSING_STOCK', 'ADJUSTMENT')),
  quantity NUMERIC(15,4) DEFAULT 0,
  unit_cost NUMERIC(15,4) DEFAULT 0,
  total_value NUMERIC(15,4) DEFAULT 0,
  movement_date DATE NOT NULL,
  reference_document TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_stock_movements_period_type ON stock_movements(period_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_code);

-- RLS for stock movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage stock movements" ON stock_movements
FOR ALL USING (auth.role() = 'authenticated');

-- Phase 3: Enhanced Trial Balance with Data Quality Indicators

-- Add data quality and completeness tracking to trial balance uploads
ALTER TABLE trial_balance_uploads 
ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS completeness_indicators JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS missing_components TEXT[],
ADD COLUMN IF NOT EXISTS stock_reconciliation_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS has_opening_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_closing_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cogs_calculated BOOLEAN DEFAULT FALSE;

-- Create materialized view for financial statement completeness
CREATE MATERIALIZED VIEW IF NOT EXISTS financial_completeness_view AS
SELECT 
  fp.id as period_id,
  fp.quarter,
  fp.year,
  fp.quarter_end_date,
  COUNT(DISTINCT tbe.id) as total_entries,
  COUNT(DISTINCT CASE WHEN tbe.account_type = 'ASSETS' THEN tbe.id END) as asset_entries,
  COUNT(DISTINCT CASE WHEN tbe.account_type = 'LIABILITIES' THEN tbe.id END) as liability_entries,
  COUNT(DISTINCT CASE WHEN tbe.account_type = 'EQUITY' THEN tbe.id END) as equity_entries,
  COUNT(DISTINCT CASE WHEN tbe.account_type = 'REVENUE' THEN tbe.id END) as revenue_entries,
  COUNT(DISTINCT CASE WHEN tbe.account_type = 'EXPENSES' THEN tbe.id END) as expense_entries,
  COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%opening%stock%' THEN tbe.id END) as opening_stock_entries,
  COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%closing%stock%' THEN tbe.id END) as closing_stock_entries,
  COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%cost%goods%sold%' OR tbe.ledger_name ILIKE '%cogs%' THEN tbe.id END) as cogs_entries,
  SUM(CASE WHEN tbe.account_type = 'ASSETS' THEN COALESCE(tbe.closing_balance, tbe.debit - tbe.credit) ELSE 0 END) as total_assets,
  SUM(CASE WHEN tbe.account_type = 'LIABILITIES' THEN COALESCE(tbe.closing_balance, tbe.credit - tbe.debit) ELSE 0 END) as total_liabilities,
  SUM(CASE WHEN tbe.account_type = 'EQUITY' THEN COALESCE(tbe.closing_balance, tbe.credit - tbe.debit) ELSE 0 END) as total_equity,
  SUM(CASE WHEN tbe.account_type = 'REVENUE' THEN COALESCE(tbe.closing_balance, tbe.credit - tbe.debit) ELSE 0 END) as total_revenue,
  SUM(CASE WHEN tbe.account_type = 'EXPENSES' THEN COALESCE(tbe.closing_balance, tbe.debit - tbe.credit) ELSE 0 END) as total_expenses,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%opening%stock%' THEN tbe.id END) > 0 
         AND COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%closing%stock%' THEN tbe.id END) > 0 
    THEN 'COMPLETE'
    WHEN COUNT(DISTINCT CASE WHEN tbe.ledger_name ILIKE '%stock%' THEN tbe.id END) > 0 
    THEN 'PARTIAL'
    ELSE 'MISSING'
  END as stock_data_status,
  ROUND(
    (CASE WHEN COUNT(DISTINCT CASE WHEN tbe.account_type = 'ASSETS' THEN tbe.id END) > 0 THEN 20 ELSE 0 END +
     CASE WHEN COUNT(DISTINCT CASE WHEN tbe.account_type = 'LIABILITIES' THEN tbe.id END) > 0 THEN 20 ELSE 0 END +
     CASE WHEN COUNT(DISTINCT CASE WHEN tbe.account_type = 'EQUITY' THEN tbe.id END) > 0 THEN 20 ELSE 0 END +
     CASE WHEN COUNT(DISTINCT CASE WHEN tbe.account_type = 'REVENUE' THEN tbe.id END) > 0 THEN 20 ELSE 0 END +
     CASE WHEN COUNT(DISTINCT CASE WHEN tbe.account_type = 'EXPENSES' THEN tbe.id END) > 0 THEN 20 ELSE 0 END) / 100.0
  , 2) as completeness_score
FROM financial_periods fp
LEFT JOIN trial_balance_entries tbe ON fp.id = tbe.period_id
GROUP BY fp.id, fp.quarter, fp.year, fp.quarter_end_date;

CREATE INDEX IF NOT EXISTS idx_financial_completeness_period ON financial_completeness_view(period_id);

-- Phase 4: Data Quality Functions

-- Function to calculate COGS and validate stock reconciliation
CREATE OR REPLACE FUNCTION public.calculate_cogs_and_validate_stock(period_id_param INTEGER)
RETURNS JSONB AS $$
DECLARE
  opening_stock NUMERIC := 0;
  closing_stock NUMERIC := 0;
  purchases NUMERIC := 0;
  calculated_cogs NUMERIC := 0;
  existing_cogs NUMERIC := 0;
  result JSONB;
  stock_entries_count INTEGER := 0;
BEGIN
  -- Get opening stock
  SELECT COALESCE(SUM(COALESCE(closing_balance, debit - credit)), 0)
  INTO opening_stock
  FROM trial_balance_entries 
  WHERE period_id = period_id_param 
  AND (ledger_name ILIKE '%opening%stock%' OR ledger_name ILIKE '%opening%inventory%');
  
  -- Get closing stock  
  SELECT COALESCE(SUM(COALESCE(closing_balance, debit - credit)), 0)
  INTO closing_stock
  FROM trial_balance_entries 
  WHERE period_id = period_id_param 
  AND (ledger_name ILIKE '%closing%stock%' OR ledger_name ILIKE '%closing%inventory%');
  
  -- Get purchases
  SELECT COALESCE(SUM(COALESCE(closing_balance, debit - credit)), 0)
  INTO purchases
  FROM trial_balance_entries 
  WHERE period_id = period_id_param 
  AND (ledger_name ILIKE '%purchase%' AND ledger_name NOT ILIKE '%return%');
  
  -- Get existing COGS entries
  SELECT COALESCE(SUM(COALESCE(closing_balance, debit - credit)), 0)
  INTO existing_cogs
  FROM trial_balance_entries 
  WHERE period_id = period_id_param 
  AND (ledger_name ILIKE '%cost%goods%sold%' OR ledger_name ILIKE '%cogs%');
  
  -- Calculate COGS: Opening Stock + Purchases - Closing Stock
  calculated_cogs := opening_stock + purchases - closing_stock;
  
  -- Count stock-related entries
  SELECT COUNT(*)
  INTO stock_entries_count
  FROM trial_balance_entries 
  WHERE period_id = period_id_param 
  AND (ledger_name ILIKE '%stock%' OR ledger_name ILIKE '%inventory%');
  
  result := jsonb_build_object(
    'period_id', period_id_param,
    'opening_stock', opening_stock,
    'closing_stock', closing_stock,
    'purchases', purchases,
    'calculated_cogs', calculated_cogs,
    'existing_cogs', existing_cogs,
    'cogs_variance', calculated_cogs - existing_cogs,
    'stock_entries_count', stock_entries_count,
    'has_complete_stock_data', (opening_stock > 0 AND closing_stock > 0),
    'validation_status', CASE 
      WHEN stock_entries_count = 0 THEN 'NO_STOCK_DATA'
      WHEN opening_stock = 0 AND closing_stock = 0 THEN 'MISSING_STOCK_DETAILS'
      WHEN ABS(calculated_cogs - existing_cogs) > (calculated_cogs * 0.05) THEN 'COGS_MISMATCH'
      ELSE 'VALIDATED'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 5: Audit Trail and Data Governance

-- Create comprehensive audit log
CREATE TABLE IF NOT EXISTS financial_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'BULK_OPERATION')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  session_info JSONB,
  business_reason TEXT,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON financial_audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_time ON financial_audit_trail(user_id, created_at);

-- RLS for audit trail
ALTER TABLE financial_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit trail" ON financial_audit_trail
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert audit records" ON financial_audit_trail
FOR INSERT WITH CHECK (true);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_financial_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW financial_completeness_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.clean_upload_cascade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cogs_and_validate_stock(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_financial_analytics() TO authenticated;