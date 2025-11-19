-- Remove the old policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;

-- Create new policy that allows everyone to view departments
CREATE POLICY "Anyone can view departments"
ON departments FOR SELECT
TO anon, authenticated
USING (true);

-- Keep admin-only policy for modifications (already exists)
-- "Admins can manage departments" remains unchanged