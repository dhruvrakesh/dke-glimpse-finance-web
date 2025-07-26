-- Emergency data restoration: Insert core Schedule 3 master items directly
INSERT INTO schedule3_master_items (schedule3_item, report_section, report_sub_section, report_type, is_credit_positive, display_order) VALUES
-- Balance Sheet Assets
('Property, Plant and Equipment', 'Non-Current Assets', null, 'BalanceSheet', false, 101),
('Investment Property', 'Non-Current Assets', null, 'BalanceSheet', false, 102),
('Intangible Assets', 'Non-Current Assets', null, 'BalanceSheet', false, 103),
('Investments', 'Non-Current Assets', 'Financial Assets', 'BalanceSheet', false, 104),
('Trade Receivables', 'Current Assets', 'Financial Assets', 'BalanceSheet', false, 201),
('Cash and Cash Equivalents', 'Current Assets', 'Financial Assets', 'BalanceSheet', false, 202),
('Bank Balance other than Cash and Cash Equivalents', 'Current Assets', 'Financial Assets', 'BalanceSheet', false, 203),
('Inventories', 'Current Assets', null, 'BalanceSheet', false, 204),
('Other Current Assets', 'Current Assets', null, 'BalanceSheet', false, 205),

-- Balance Sheet Equity & Liabilities
('Equity Share Capital', 'Equity', null, 'BalanceSheet', true, 301),
('Other Equity', 'Equity', null, 'BalanceSheet', true, 302),
('Borrowings', 'Non-Current Liabilities', 'Financial Liabilities', 'BalanceSheet', true, 401),
('Provisions', 'Non-Current Liabilities', null, 'BalanceSheet', true, 402),
('Deferred Tax Liabilities', 'Non-Current Liabilities', null, 'BalanceSheet', true, 403),
('Borrowings', 'Current Liabilities', 'Financial Liabilities', 'BalanceSheet', true, 501),
('Trade Payables', 'Current Liabilities', 'Financial Liabilities', 'BalanceSheet', true, 502),
('Other Current Liabilities', 'Current Liabilities', null, 'BalanceSheet', true, 503),
('Short-term Provisions', 'Current Liabilities', null, 'BalanceSheet', true, 504),

-- Profit & Loss
('Revenue from Operations', 'Revenue', null, 'ProfitAndLoss', true, 601),
('Other Income', 'Revenue', null, 'ProfitAndLoss', true, 602),
('Cost of Materials Consumed', 'Expenses', null, 'ProfitAndLoss', false, 701),
('Purchase of Stock-in-Trade', 'Expenses', null, 'ProfitAndLoss', false, 702),
('Changes in Inventories', 'Expenses', null, 'ProfitAndLoss', false, 703),
('Employee Benefits Expense', 'Expenses', null, 'ProfitAndLoss', false, 704),
('Finance Costs', 'Expenses', null, 'ProfitAndLoss', false, 705),
('Depreciation and Amortisation Expense', 'Expenses', null, 'ProfitAndLoss', false, 706),
('Other Expenses', 'Expenses', null, 'ProfitAndLoss', false, 707)
ON CONFLICT (schedule3_item, report_section, COALESCE(report_sub_section, '')) DO NOTHING;