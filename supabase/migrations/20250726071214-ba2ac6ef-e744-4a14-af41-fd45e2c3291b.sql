-- Fix the financial_periods table schema to match the seeder expectations
-- Remove the problematic upsert constraint and fix the data structure

-- First, let's check what's actually in the financial_periods table
-- and clean up any duplicate data issues

-- Add period_name column if it doesn't exist
ALTER TABLE financial_periods 
ADD COLUMN IF NOT EXISTS period_name TEXT;

-- Create a proper unique constraint for period identification
DROP INDEX IF EXISTS financial_periods_period_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS financial_periods_unique_period 
ON financial_periods (year, quarter);

-- Clean up any duplicate rows that might exist
DELETE FROM financial_periods 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM financial_periods 
  GROUP BY year, quarter
);

-- Update existing records to have proper period names
UPDATE financial_periods 
SET period_name = CONCAT('Q', quarter, ' ', year)
WHERE period_name IS NULL AND quarter IS NOT NULL AND year IS NOT NULL;