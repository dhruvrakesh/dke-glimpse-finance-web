-- Add missing columns to financial_periods table
ALTER TABLE financial_periods 
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS quarter INTEGER,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add unique constraint to prevent duplicate periods
ALTER TABLE financial_periods 
ADD CONSTRAINT unique_year_quarter UNIQUE (year, quarter);