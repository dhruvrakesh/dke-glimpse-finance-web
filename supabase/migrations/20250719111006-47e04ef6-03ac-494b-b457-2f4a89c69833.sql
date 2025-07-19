-- Add period_id column to schedule3_mapping table to support period-based mappings
ALTER TABLE public.schedule3_mapping 
ADD COLUMN period_id uuid REFERENCES public.financial_periods(id);

-- Create index for better performance on period-based queries
CREATE INDEX idx_schedule3_mapping_period_id ON public.schedule3_mapping(period_id);

-- Update RLS policy to include period_id access
DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.schedule3_mapping;
CREATE POLICY "Authenticated users can manage mappings" 
ON public.schedule3_mapping 
FOR ALL 
USING (true) 
WITH CHECK (true);