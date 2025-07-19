-- Add period_id column to schedule3_mapping table (integer to match financial_periods.id)
ALTER TABLE public.schedule3_mapping 
ADD COLUMN period_id integer REFERENCES public.financial_periods(id);

-- Create index for better performance on period-based queries
CREATE INDEX idx_schedule3_mapping_period_id ON public.schedule3_mapping(period_id);