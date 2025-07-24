-- Enable RLS on financial_periods and trial_balance_entries if not already enabled
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_balance_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_periods
CREATE POLICY "Authenticated users can view financial periods" 
ON financial_periods FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create financial periods" 
ON financial_periods FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Create RLS policies for trial_balance_entries
CREATE POLICY "Authenticated users can view trial balance entries" 
ON trial_balance_entries FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create trial balance entries" 
ON trial_balance_entries FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');