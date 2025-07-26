-- Add unique constraint to schedule3_master_items table to support upsert operations
ALTER TABLE public.schedule3_master_items 
ADD CONSTRAINT schedule3_master_items_unique_key 
UNIQUE (schedule3_item, report_type, report_section);