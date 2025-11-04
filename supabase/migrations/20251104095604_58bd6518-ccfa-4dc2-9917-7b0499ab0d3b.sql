-- Step 2: Add RLS policies for management role
CREATE POLICY "Management can view all reports"
ON public.error_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

CREATE POLICY "Management can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

CREATE POLICY "Management can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));