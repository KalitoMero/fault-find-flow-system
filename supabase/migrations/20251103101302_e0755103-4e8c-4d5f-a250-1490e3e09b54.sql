-- Add additional_excel_data column to error_reports table
ALTER TABLE public.error_reports
ADD COLUMN IF NOT EXISTS additional_excel_data jsonb;