-- Add column_order to excel_settings table to preserve original column order
ALTER TABLE excel_settings 
ADD COLUMN column_order jsonb;