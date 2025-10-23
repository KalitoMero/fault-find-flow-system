-- Fix RLS policies for Excel data and settings
-- Restrict access to admin users only for sensitive business data

-- 1. Fix excel_data table - restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can view excel data" ON public.excel_data;

CREATE POLICY "Only admins can view excel data"
ON public.excel_data
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix excel_settings table - restrict SELECT to admins only
DROP POLICY IF EXISTS "excel_settings_select" ON public.excel_settings;

CREATE POLICY "Only admins can view excel settings"
ON public.excel_settings
FOR SELECT
USING (is_admin() OR (auth.role() = 'service_role'::text));

-- 3. Add explicit SELECT policy for app_settings (currently only has ALL policy)
CREATE POLICY "Only admins can view app settings"
ON public.app_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Note: The ALL policy on app_settings already restricts to admins,
-- but having an explicit SELECT policy provides defense-in-depth