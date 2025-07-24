-- Phase 1: Enhanced Data Foundation for Enterprise Financial Reporting (Fixed)

-- Account Hierarchy Table
CREATE TABLE public.account_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  parent_account_id UUID,
  account_level INTEGER NOT NULL DEFAULT 1,
  account_type TEXT NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
  report_category TEXT, -- 'CURRENT_ASSET', 'FIXED_ASSET', 'CURRENT_LIABILITY', etc.
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (parent_account_id) REFERENCES public.account_hierarchy(id)
);

-- Budget Entries Table
CREATE TABLE public.budget_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'ORIGINAL', -- 'ORIGINAL', 'REVISED', 'LATEST_ESTIMATE'
  budget_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  budget_version INTEGER DEFAULT 1,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (period_id) REFERENCES public.financial_periods(id),
  UNIQUE(period_id, account_code, budget_type, budget_version)
);

-- Ratio Definitions Table
CREATE TABLE public.ratio_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ratio_name TEXT NOT NULL UNIQUE,
  ratio_category TEXT NOT NULL, -- 'LIQUIDITY', 'PROFITABILITY', 'EFFICIENCY', 'LEVERAGE'
  formula_description TEXT NOT NULL,
  calculation_formula JSONB NOT NULL, -- Store formula components
  target_value NUMERIC(10,4),
  benchmark_value NUMERIC(10,4),
  industry_average NUMERIC(10,4),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Calculated Ratios Table
CREATE TABLE public.calculated_ratios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id INTEGER NOT NULL,
  ratio_definition_id UUID NOT NULL,
  calculated_value NUMERIC(10,4),
  numerator_value NUMERIC(15,2),
  denominator_value NUMERIC(15,2),
  calculation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (period_id) REFERENCES public.financial_periods(id),
  FOREIGN KEY (ratio_definition_id) REFERENCES public.ratio_definitions(id),
  UNIQUE(period_id, ratio_definition_id)
);

-- Report Templates Table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'BALANCE_SHEET', 'PROFIT_LOSS', 'CASH_FLOW', 'RATIO_ANALYSIS'
  template_structure JSONB NOT NULL, -- Store report structure and formatting
  regulatory_standard TEXT, -- 'SCHEDULE_3', 'IND_AS', 'GAAP'
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced Mappings Table (extends existing mapping functionality)
CREATE TABLE public.enhanced_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_mapping_id UUID, -- Reference to schedule3_mapping
  account_hierarchy_id UUID,
  mapping_confidence NUMERIC(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  auto_mapped BOOLEAN DEFAULT false,
  review_required BOOLEAN DEFAULT false,
  mapped_by UUID,
  reviewed_by UUID,
  mapping_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (original_mapping_id) REFERENCES public.schedule3_mapping(id),
  FOREIGN KEY (account_hierarchy_id) REFERENCES public.account_hierarchy(id)
);

-- Materiality Settings Table
CREATE TABLE public.materiality_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL,
  materiality_type TEXT NOT NULL, -- 'PERCENTAGE', 'ABSOLUTE_AMOUNT'
  threshold_value NUMERIC(15,2) NOT NULL,
  applicable_to TEXT NOT NULL, -- 'BALANCE_SHEET', 'PROFIT_LOSS', 'ALL_REPORTS'
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_account_hierarchy_parent ON public.account_hierarchy(parent_account_id);
CREATE INDEX idx_account_hierarchy_type ON public.account_hierarchy(account_type);
CREATE INDEX idx_budget_entries_period ON public.budget_entries(period_id);
CREATE INDEX idx_budget_entries_account ON public.budget_entries(account_code);
CREATE INDEX idx_calculated_ratios_period ON public.calculated_ratios(period_id);
CREATE INDEX idx_enhanced_mappings_original ON public.enhanced_mappings(original_mapping_id);

-- Insert default ratio definitions
INSERT INTO public.ratio_definitions (ratio_name, ratio_category, formula_description, calculation_formula, target_value, display_order) VALUES
('Current Ratio', 'LIQUIDITY', 'Current Assets / Current Liabilities', '{"numerator": "CURRENT_ASSETS", "denominator": "CURRENT_LIABILITIES"}', 2.0, 1),
('Quick Ratio', 'LIQUIDITY', '(Current Assets - Inventory) / Current Liabilities', '{"numerator": "CURRENT_ASSETS_MINUS_INVENTORY", "denominator": "CURRENT_LIABILITIES"}', 1.0, 2),
('Gross Profit Margin', 'PROFITABILITY', 'Gross Profit / Revenue * 100', '{"numerator": "GROSS_PROFIT", "denominator": "REVENUE", "multiply": 100}', 25.0, 3),
('Net Profit Margin', 'PROFITABILITY', 'Net Profit / Revenue * 100', '{"numerator": "NET_PROFIT", "denominator": "REVENUE", "multiply": 100}', 10.0, 4),
('Debt to Equity', 'LEVERAGE', 'Total Debt / Total Equity', '{"numerator": "TOTAL_DEBT", "denominator": "TOTAL_EQUITY"}', 0.5, 5),
('Asset Turnover', 'EFFICIENCY', 'Revenue / Average Total Assets', '{"numerator": "REVENUE", "denominator": "AVERAGE_TOTAL_ASSETS"}', 1.5, 6);

-- Insert default report templates
INSERT INTO public.report_templates (template_name, template_type, template_structure, regulatory_standard, is_default) VALUES
('Standard Balance Sheet', 'BALANCE_SHEET', '{"sections": [{"name": "ASSETS", "subsections": ["CURRENT_ASSETS", "NON_CURRENT_ASSETS"]}, {"name": "LIABILITIES", "subsections": ["CURRENT_LIABILITIES", "NON_CURRENT_LIABILITIES"]}, {"name": "EQUITY", "subsections": ["SHARE_CAPITAL", "RESERVES"]}]}', 'SCHEDULE_3', true),
('Standard P&L Statement', 'PROFIT_LOSS', '{"sections": [{"name": "REVENUE", "subsections": ["OPERATING_REVENUE", "OTHER_INCOME"]}, {"name": "EXPENSES", "subsections": ["COST_OF_GOODS_SOLD", "OPERATING_EXPENSES", "FINANCE_COSTS"]}, {"name": "PROFIT", "subsections": ["GROSS_PROFIT", "OPERATING_PROFIT", "NET_PROFIT"]}]}', 'SCHEDULE_3', true);

-- Insert default materiality settings
INSERT INTO public.materiality_settings (setting_name, materiality_type, threshold_value, applicable_to) VALUES
('General Materiality - 1%', 'PERCENTAGE', 1.0, 'ALL_REPORTS'),
('Balance Sheet Materiality - 0.5%', 'PERCENTAGE', 0.5, 'BALANCE_SHEET'),
('P&L Materiality - 2%', 'PERCENTAGE', 2.0, 'PROFIT_LOSS'),
('Absolute Materiality - 10 Lakhs', 'ABSOLUTE_AMOUNT', 1000000, 'ALL_REPORTS');

-- Enable RLS on all new tables
ALTER TABLE public.account_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratio_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculated_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiality_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage account hierarchy" ON public.account_hierarchy FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage budget entries" ON public.budget_entries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view ratio definitions" ON public.ratio_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage calculated ratios" ON public.calculated_ratios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view report templates" ON public.report_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage enhanced mappings" ON public.enhanced_mappings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view materiality settings" ON public.materiality_settings FOR SELECT USING (auth.role() = 'authenticated');

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_account_hierarchy_updated_at BEFORE UPDATE ON public.account_hierarchy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_entries_updated_at BEFORE UPDATE ON public.budget_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ratio_definitions_updated_at BEFORE UPDATE ON public.ratio_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enhanced_mappings_updated_at BEFORE UPDATE ON public.enhanced_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materiality_settings_updated_at BEFORE UPDATE ON public.materiality_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();