-- Allow teamleaders and admins to view excel data
DROP POLICY IF EXISTS "Only admins can view excel data" ON excel_data;

CREATE POLICY "Admins and teamleaders can view excel data" 
ON excel_data 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teamleader'::app_role)
);

-- Allow teamleaders and admins to view excel settings
DROP POLICY IF EXISTS "Only admins can view excel settings" ON excel_settings;

CREATE POLICY "Admins and teamleaders can view excel settings" 
ON excel_settings 
FOR SELECT 
USING (
  is_admin() OR 
  has_role('teamleader')
);