-- Remove the conflicting old constraint that prevents Schedule 3 seeding
ALTER TABLE public.schedule3_master_items 
DROP CONSTRAINT IF EXISTS schedule3_master_items_report_type_schedule3_item_key;