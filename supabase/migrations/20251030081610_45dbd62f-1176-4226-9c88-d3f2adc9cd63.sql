-- Create a function to quickly clear Excel data using TRUNCATE
-- TRUNCATE is much faster than DELETE for clearing entire tables
CREATE OR REPLACE FUNCTION public.clear_excel_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can clear Excel data';
  END IF;
  
  -- Truncate both tables (much faster than DELETE)
  TRUNCATE TABLE public.excel_data;
  TRUNCATE TABLE public.excel_settings;
END;
$$;