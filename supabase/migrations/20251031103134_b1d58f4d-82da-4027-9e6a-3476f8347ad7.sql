-- Drop the restrictive policy for viewing excel data
DROP POLICY IF EXISTS "Admins and teamleaders can view excel data" ON excel_data;

-- Create new policy that allows all authenticated users to view excel data
CREATE POLICY "Authenticated users can view excel data"
ON excel_data
FOR SELECT
TO authenticated
USING (true);

-- Update excel_settings policy to allow all authenticated users to view settings
DROP POLICY IF EXISTS "Admins and teamleaders can view excel settings" ON excel_settings;

CREATE POLICY "Authenticated users can view excel settings"
ON excel_settings
FOR SELECT
TO authenticated
USING (true);