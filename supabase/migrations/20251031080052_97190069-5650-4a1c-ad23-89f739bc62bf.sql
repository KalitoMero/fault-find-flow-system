-- Allow admins to delete error reports
CREATE POLICY "Admins can delete error reports"
ON public.error_reports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow team leaders to delete reports assigned to them
CREATE POLICY "Team leaders can delete assigned reports"
ON public.error_reports
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'teamleader'::app_role) 
  AND assigned_team_leader_id = auth.uid()
);