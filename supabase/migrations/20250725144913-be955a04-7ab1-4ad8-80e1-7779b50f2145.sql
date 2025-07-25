-- Fix mapping stats calculation and implement ratio calculation engine

-- Create function to properly calculate mapping statistics
CREATE OR REPLACE FUNCTION get_mapping_statistics()
RETURNS TABLE(
    total_accounts integer,
    mapped_accounts integer,
    completion_percentage numeric
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH trial_accounts AS (
        SELECT DISTINCT ledger_name FROM trial_balance_entries
    ),
    mapped_accounts_set AS (
        SELECT DISTINCT tally_ledger_name FROM schedule3_mapping
    ),
    mapping_stats AS (
        SELECT 
            COUNT(DISTINCT ta.ledger_name) as total_count,
            COUNT(DISTINCT CASE WHEN mas.tally_ledger_name IS NOT NULL THEN ta.ledger_name END) as mapped_count
        FROM trial_accounts ta
        LEFT JOIN mapped_accounts_set mas ON ta.ledger_name = mas.tally_ledger_name
    )
    SELECT 
        total_count::integer,
        mapped_count::integer,
        CASE 
            WHEN total_count > 0 THEN ROUND((mapped_count::numeric / total_count::numeric) * 100, 2)
            ELSE 0
        END as completion_percentage
    FROM mapping_stats;
END;
$$;

-- Create automated ratio calculation function
CREATE OR REPLACE FUNCTION calculate_financial_ratios(p_period_id integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_current_assets numeric := 0;
    v_current_liabilities numeric := 0;
    v_total_assets numeric := 0;
    v_total_debt numeric := 0;
    v_total_equity numeric := 0;
    v_revenue numeric := 0;
    v_gross_profit numeric := 0;
    v_net_profit numeric := 0;
    v_inventory numeric := 0;
    ratio_rec record;
BEGIN
    -- Get financial data from balance sheet view
    SELECT 
        COALESCE(SUM(CASE WHEN category = 'CURRENT_ASSETS' THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'CURRENT_LIABILITIES' THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category IN ('CURRENT_ASSETS', 'FIXED_ASSETS') THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category IN ('CURRENT_LIABILITIES', 'LONG_TERM_LIABILITIES') THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'EQUITY' THEN net_amount ELSE 0 END), 0)
    INTO v_current_assets, v_current_liabilities, v_total_assets, v_total_debt, v_total_equity
    FROM balance_sheet_view 
    WHERE period_id = p_period_id;

    -- Get P&L data (assuming we'll create this view)
    SELECT 
        COALESCE(SUM(CASE WHEN report_type = 'INCOME' THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_name LIKE '%Gross Profit%' THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_name LIKE '%Net Profit%' THEN net_amount ELSE 0 END), 0)
    INTO v_revenue, v_gross_profit, v_net_profit
    FROM balance_sheet_view 
    WHERE period_id = p_period_id AND report_type = 'INCOME';

    -- Calculate and insert ratios
    FOR ratio_rec IN SELECT * FROM ratio_definitions WHERE is_active = true LOOP
        DECLARE
            v_calculated_value numeric := 0;
            v_numerator_value numeric := 0;
            v_denominator_value numeric := 0;
        BEGIN
            CASE ratio_rec.ratio_code
                WHEN 'CURRENT_RATIO' THEN
                    v_numerator_value := v_current_assets;
                    v_denominator_value := v_current_liabilities;
                    v_calculated_value := CASE WHEN v_current_liabilities != 0 THEN v_current_assets / v_current_liabilities ELSE 0 END;
                
                WHEN 'QUICK_RATIO' THEN
                    v_numerator_value := v_current_assets - v_inventory;
                    v_denominator_value := v_current_liabilities;
                    v_calculated_value := CASE WHEN v_current_liabilities != 0 THEN (v_current_assets - v_inventory) / v_current_liabilities ELSE 0 END;
                
                WHEN 'DEBT_TO_EQUITY' THEN
                    v_numerator_value := v_total_debt;
                    v_denominator_value := v_total_equity;
                    v_calculated_value := CASE WHEN v_total_equity != 0 THEN v_total_debt / v_total_equity ELSE 0 END;
                
                WHEN 'ASSET_TURNOVER' THEN
                    v_numerator_value := v_revenue;
                    v_denominator_value := v_total_assets;
                    v_calculated_value := CASE WHEN v_total_assets != 0 THEN v_revenue / v_total_assets ELSE 0 END;
                
                WHEN 'GROSS_PROFIT_MARGIN' THEN
                    v_numerator_value := v_gross_profit;
                    v_denominator_value := v_revenue;
                    v_calculated_value := CASE WHEN v_revenue != 0 THEN (v_gross_profit / v_revenue) * 100 ELSE 0 END;
                
                WHEN 'NET_PROFIT_MARGIN' THEN
                    v_numerator_value := v_net_profit;
                    v_denominator_value := v_revenue;
                    v_calculated_value := CASE WHEN v_revenue != 0 THEN (v_net_profit / v_revenue) * 100 ELSE 0 END;
                
                ELSE
                    CONTINUE;
            END CASE;

            -- Insert or update calculated ratio
            INSERT INTO calculated_ratios (
                ratio_definition_id,
                period_id,
                calculated_value,
                numerator_value,
                denominator_value,
                calculation_date
            ) VALUES (
                ratio_rec.id,
                p_period_id,
                v_calculated_value,
                v_numerator_value,
                v_denominator_value,
                NOW()
            )
            ON CONFLICT (ratio_definition_id, period_id) 
            DO UPDATE SET
                calculated_value = EXCLUDED.calculated_value,
                numerator_value = EXCLUDED.numerator_value,
                denominator_value = EXCLUDED.denominator_value,
                calculation_date = NOW();
        END;
    END LOOP;
END;
$$;

-- Create profit and loss view
CREATE OR REPLACE VIEW profit_and_loss_view AS
SELECT 
    tbe.id,
    tbe.ledger_name,
    tbe.debit,
    tbe.credit,
    tbe.period_id,
    sm.id as mapping_id,
    sm.tally_ledger_name,
    sm.item_code,
    sm.item_name,
    sm.category,
    sm.sub_category,
    CASE 
        WHEN sm.category IN ('REVENUE', 'SALES', 'INCOME') THEN 'INCOME'
        WHEN sm.category IN ('EXPENSES', 'COST_OF_SALES', 'OPERATING_EXPENSES') THEN 'EXPENSES'
        ELSE 'OTHER'
    END as report_type,
    (COALESCE(tbe.credit, 0) - COALESCE(tbe.debit, 0)) as net_amount
FROM trial_balance_entries tbe
LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name
WHERE sm.category IN ('REVENUE', 'SALES', 'INCOME', 'EXPENSES', 'COST_OF_SALES', 'OPERATING_EXPENSES');

-- Create cash flow view structure
CREATE OR REPLACE VIEW cash_flow_view AS
SELECT 
    tbe.id,
    tbe.ledger_name,
    tbe.debit,
    tbe.credit,
    tbe.period_id,
    sm.id as mapping_id,
    sm.tally_ledger_name,
    sm.item_code,
    sm.item_name,
    sm.category,
    CASE 
        WHEN sm.category IN ('REVENUE', 'EXPENSES', 'CURRENT_ASSETS', 'CURRENT_LIABILITIES') THEN 'OPERATING'
        WHEN sm.category IN ('FIXED_ASSETS', 'INVESTMENTS') THEN 'INVESTING'
        WHEN sm.category IN ('LOANS', 'EQUITY', 'DIVIDENDS') THEN 'FINANCING'
        ELSE 'OTHER'
    END as cash_flow_category,
    (COALESCE(tbe.credit, 0) - COALESCE(tbe.debit, 0)) as net_amount
FROM trial_balance_entries tbe
LEFT JOIN schedule3_mapping sm ON tbe.ledger_name = sm.tally_ledger_name;

-- Update ratio definitions with proper target values and industry averages
UPDATE ratio_definitions SET
    target_value = CASE 
        WHEN ratio_code = 'CURRENT_RATIO' THEN 2.0
        WHEN ratio_code = 'QUICK_RATIO' THEN 1.0
        WHEN ratio_code = 'DEBT_TO_EQUITY' THEN 0.5
        WHEN ratio_code = 'ASSET_TURNOVER' THEN 1.5
        WHEN ratio_code = 'GROSS_PROFIT_MARGIN' THEN 25.0
        WHEN ratio_code = 'NET_PROFIT_MARGIN' THEN 10.0
        ELSE target_value
    END,
    industry_average = CASE 
        WHEN ratio_code = 'CURRENT_RATIO' THEN 1.8
        WHEN ratio_code = 'QUICK_RATIO' THEN 0.9
        WHEN ratio_code = 'DEBT_TO_EQUITY' THEN 0.6
        WHEN ratio_code = 'ASSET_TURNOVER' THEN 1.2
        WHEN ratio_code = 'GROSS_PROFIT_MARGIN' THEN 22.0
        WHEN ratio_code = 'NET_PROFIT_MARGIN' THEN 8.0
        ELSE industry_average
    END
WHERE is_active = true;

-- Calculate ratios for existing periods
DO $$
DECLARE
    period_rec record;
BEGIN
    FOR period_rec IN SELECT DISTINCT period_id FROM trial_balance_entries LOOP
        PERFORM calculate_financial_ratios(period_rec.period_id);
    END LOOP;
END $$;