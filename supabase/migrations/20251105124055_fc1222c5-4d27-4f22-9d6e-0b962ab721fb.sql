-- Allow employees to update their own error reports
-- They can only edit: problem_description, corrective_action, defective_quantity, edited_at, edited_by_id
-- They cannot change approval status or other critical fields
CREATE POLICY "Employees can update own reports" 
ON public.error_reports 
FOR UPDATE 
USING (creator_id = auth.uid())
WITH CHECK (
  creator_id = auth.uid() AND
  -- Ensure critical fields are not changed by employees
  order_number = (SELECT order_number FROM error_reports WHERE id = error_reports.id) AND
  afo_number = (SELECT afo_number FROM error_reports WHERE id = error_reports.id) AND
  creator_id = (SELECT creator_id FROM error_reports WHERE id = error_reports.id)
);