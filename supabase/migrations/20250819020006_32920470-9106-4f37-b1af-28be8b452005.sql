-- Fix deletion infrastructure and implement complete financial data management

-- Drop and recreate clean_upload_cascade function with proper column references
DROP FUNCTION IF EXISTS public.clean_upload_cascade(UUID);

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
    
    -- Delete schedule3 mappings
    DELETE FROM schedule3_mapping WHERE upload_id = upload_id_param;
    GET DIAGNOSTICS mapping_deleted = ROW_COUNT;
    
    -- Delete the upload record
    DELETE FROM trial_balance_uploads WHERE id = upload_id_param;
    
    result := jsonb_build_object(
      'success', true,
      'entries_deleted', entries_deleted,
      'mapping_deleted', mapping_deleted,
      'message', 'Successfully deleted upload and related data'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced financial periods view with data availability
CREATE OR REPLACE VIEW financial_periods_with_data AS
SELECT 
  p.id,
  p.year,
  p.quarter,
  p.created_at,
  COUNT(tb.id) as entry_count,
  COUNT(CASE WHEN tb.mapping_id IS NOT NULL THEN 1 END) as mapped_count,
  CASE 
    WHEN COUNT(tb.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN tb.mapping_id IS NOT NULL THEN 1 END)::numeric / COUNT(tb.id)::numeric) * 100, 2)
  END as mapping_percentage,
  CASE 
    WHEN COUNT(tb.id) = 0 THEN false
    ELSE true
  END as has_data
FROM financial_periods p
LEFT JOIN trial_balance_entries tb ON p.id = tb.period_id
GROUP BY p.id, p.year, p.quarter, p.created_at
ORDER BY p.year DESC, p.quarter DESC;

-- Create comprehensive account mapping function
CREATE OR REPLACE FUNCTION public.get_unmapped_accounts(period_id_param INTEGER)
RETURNS TABLE(
  entry_id INTEGER,
  ledger_name TEXT,
  debit NUMERIC,
  credit NUMERIC,
  closing_balance NUMERIC,
  suggested_account_code TEXT,
  suggested_account_name TEXT,
  confidence_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.id,
    tb.ledger_name,
    tb.debit,
    tb.credit,
    tb.closing_balance,
    -- Simple AI-like suggestions based on keywords
    CASE 
      WHEN LOWER(tb.ledger_name) LIKE '%cash%' OR LOWER(tb.ledger_name) LIKE '%bank%' THEN '1100'
      WHEN LOWER(tb.ledger_name) LIKE '%inventory%' OR LOWER(tb.ledger_name) LIKE '%stock%' THEN '1200'
      WHEN LOWER(tb.ledger_name) LIKE '%receivable%' OR LOWER(tb.ledger_name) LIKE '%debtor%' THEN '1300'
      WHEN LOWER(tb.ledger_name) LIKE '%payable%' OR LOWER(tb.ledger_name) LIKE '%creditor%' THEN '2100'
      WHEN LOWER(tb.ledger_name) LIKE '%loan%' OR LOWER(tb.ledger_name) LIKE '%debt%' THEN '2200'
      WHEN LOWER(tb.ledger_name) LIKE '%capital%' OR LOWER(tb.ledger_name) LIKE '%equity%' THEN '3100'
      WHEN LOWER(tb.ledger_name) LIKE '%sales%' OR LOWER(tb.ledger_name) LIKE '%revenue%' THEN '4100'
      WHEN LOWER(tb.ledger_name) LIKE '%purchase%' OR LOWER(tb.ledger_name) LIKE '%cost%' THEN '5100'
      WHEN LOWER(tb.ledger_name) LIKE '%expense%' OR LOWER(tb.ledger_name) LIKE '%operating%' THEN '6100'
      ELSE NULL
    END as suggested_account_code,
    CASE 
      WHEN LOWER(tb.ledger_name) LIKE '%cash%' OR LOWER(tb.ledger_name) LIKE '%bank%' THEN 'Cash and Cash Equivalents'
      WHEN LOWER(tb.ledger_name) LIKE '%inventory%' OR LOWER(tb.ledger_name) LIKE '%stock%' THEN 'Inventory'
      WHEN LOWER(tb.ledger_name) LIKE '%receivable%' OR LOWER(tb.ledger_name) LIKE '%debtor%' THEN 'Accounts Receivable'
      WHEN LOWER(tb.ledger_name) LIKE '%payable%' OR LOWER(tb.ledger_name) LIKE '%creditor%' THEN 'Accounts Payable'
      WHEN LOWER(tb.ledger_name) LIKE '%loan%' OR LOWER(tb.ledger_name) LIKE '%debt%' THEN 'Long-term Debt'
      WHEN LOWER(tb.ledger_name) LIKE '%capital%' OR LOWER(tb.ledger_name) LIKE '%equity%' THEN 'Share Capital'
      WHEN LOWER(tb.ledger_name) LIKE '%sales%' OR LOWER(tb.ledger_name) LIKE '%revenue%' THEN 'Sales Revenue'
      WHEN LOWER(tb.ledger_name) LIKE '%purchase%' OR LOWER(tb.ledger_name) LIKE '%cost%' THEN 'Cost of Goods Sold'
      WHEN LOWER(tb.ledger_name) LIKE '%expense%' OR LOWER(tb.ledger_name) LIKE '%operating%' THEN 'Operating Expenses'
      ELSE 'Unclassified'
    END as suggested_account_name,
    CASE 
      WHEN LOWER(tb.ledger_name) LIKE '%cash%' OR LOWER(tb.ledger_name) LIKE '%bank%' 
        OR LOWER(tb.ledger_name) LIKE '%sales%' OR LOWER(tb.ledger_name) LIKE '%purchase%' THEN 0.9
      WHEN LOWER(tb.ledger_name) LIKE '%inventory%' OR LOWER(tb.ledger_name) LIKE '%receivable%' 
        OR LOWER(tb.ledger_name) LIKE '%payable%' THEN 0.8
      WHEN LOWER(tb.ledger_name) LIKE '%loan%' OR LOWER(tb.ledger_name) LIKE '%capital%' 
        OR LOWER(tb.ledger_name) LIKE '%expense%' THEN 0.7
      ELSE 0.3
    END as confidence_score
  FROM trial_balance_entries tb
  WHERE tb.period_id = period_id_param 
    AND tb.mapping_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bulk mapping function
CREATE OR REPLACE FUNCTION public.bulk_apply_account_mappings(mappings JSONB)
RETURNS JSONB AS $$
DECLARE
  mapping_item JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::JSONB;
BEGIN
  FOR mapping_item IN SELECT * FROM jsonb_array_elements(mappings) LOOP
    BEGIN
      UPDATE trial_balance_entries 
      SET mapping_id = (mapping_item->>'account_hierarchy_id')::INTEGER
      WHERE id = (mapping_item->>'entry_id')::INTEGER;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'entry_id', mapping_item->>'entry_id',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate period data completeness
CREATE OR REPLACE FUNCTION public.validate_period_readiness(period_id_param INTEGER)
RETURNS JSONB AS $$
DECLARE
  total_entries INTEGER;
  mapped_entries INTEGER;
  mapping_percentage NUMERIC;
  has_assets BOOLEAN;
  has_liabilities BOOLEAN;
  has_equity BOOLEAN;
  has_revenue BOOLEAN;
  has_expenses BOOLEAN;
  is_ready BOOLEAN := false;
  warnings JSONB := '[]'::JSONB;
BEGIN
  -- Count total and mapped entries
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN mapping_id IS NOT NULL THEN 1 END)
  INTO total_entries, mapped_entries
  FROM trial_balance_entries 
  WHERE period_id = period_id_param;
  
  mapping_percentage := CASE 
    WHEN total_entries = 0 THEN 0 
    ELSE (mapped_entries::NUMERIC / total_entries::NUMERIC) * 100 
  END;
  
  -- Check for essential categories
  SELECT 
    EXISTS(SELECT 1 FROM trial_balance_entries tb 
           JOIN account_hierarchy ah ON tb.mapping_id = ah.id 
           WHERE tb.period_id = period_id_param AND ah.account_type = 'ASSETS'),
    EXISTS(SELECT 1 FROM trial_balance_entries tb 
           JOIN account_hierarchy ah ON tb.mapping_id = ah.id 
           WHERE tb.period_id = period_id_param AND ah.account_type = 'LIABILITIES'),
    EXISTS(SELECT 1 FROM trial_balance_entries tb 
           JOIN account_hierarchy ah ON tb.mapping_id = ah.id 
           WHERE tb.period_id = period_id_param AND ah.account_type = 'EQUITY'),
    EXISTS(SELECT 1 FROM trial_balance_entries tb 
           JOIN account_hierarchy ah ON tb.mapping_id = ah.id 
           WHERE tb.period_id = period_id_param AND ah.account_type = 'REVENUE'),
    EXISTS(SELECT 1 FROM trial_balance_entries tb 
           JOIN account_hierarchy ah ON tb.mapping_id = ah.id 
           WHERE tb.period_id = period_id_param AND ah.account_type = 'EXPENSES')
  INTO has_assets, has_liabilities, has_equity, has_revenue, has_expenses;
  
  -- Build warnings array
  IF mapping_percentage < 80 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'MAPPING_INCOMPLETE',
      'message', 'Less than 80% of entries are mapped (' || ROUND(mapping_percentage, 1) || '%)'
    );
  END IF;
  
  IF NOT has_assets THEN
    warnings := warnings || jsonb_build_object(
      'type', 'MISSING_ASSETS',
      'message', 'No asset accounts mapped'
    );
  END IF;
  
  IF NOT has_liabilities THEN
    warnings := warnings || jsonb_build_object(
      'type', 'MISSING_LIABILITIES', 
      'message', 'No liability accounts mapped'
    );
  END IF;
  
  IF NOT has_revenue THEN
    warnings := warnings || jsonb_build_object(
      'type', 'MISSING_REVENUE',
      'message', 'No revenue accounts mapped'
    );
  END IF;
  
  -- Determine readiness
  is_ready := mapping_percentage >= 80 AND has_assets AND has_liabilities AND has_revenue;
  
  RETURN jsonb_build_object(
    'is_ready', is_ready,
    'total_entries', total_entries,
    'mapped_entries', mapped_entries,
    'mapping_percentage', mapping_percentage,
    'has_assets', has_assets,
    'has_liabilities', has_liabilities,
    'has_equity', has_equity,
    'has_revenue', has_revenue,
    'has_expenses', has_expenses,
    'warnings', warnings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.clean_upload_cascade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unmapped_accounts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_apply_account_mappings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_period_readiness(INTEGER) TO authenticated;
GRANT SELECT ON financial_periods_with_data TO authenticated;