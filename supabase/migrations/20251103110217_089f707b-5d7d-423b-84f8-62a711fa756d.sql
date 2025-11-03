-- Drop existing delete policy for team leaders
DROP POLICY IF EXISTS "Team leaders can delete assigned reports" ON public.error_reports;

-- Create new policy: Team leaders can only delete rejected reports assigned to them
CREATE POLICY "Team leaders can delete rejected assigned reports"
ON public.error_reports
FOR DELETE
USING (
  has_role(auth.uid(), 'teamleader'::app_role) 
  AND assigned_team_leader_id = auth.uid() 
  AND approval_status = 'rejected'
);

-- Keep existing admin delete policy (admins can delete all)
-- Already exists: "Admins can delete error reports"