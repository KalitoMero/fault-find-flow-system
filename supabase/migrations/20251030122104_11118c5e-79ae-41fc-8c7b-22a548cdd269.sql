-- Allow all authenticated users to view approved error reports
CREATE POLICY "All users can view approved reports"
ON public.error_reports
FOR SELECT
TO authenticated
USING (approval_status = 'approved');