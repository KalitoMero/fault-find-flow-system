-- Add database constraints for server-side validation
-- These constraints enforce the same rules as the client-side zod schemas

-- Error Reports Constraints
ALTER TABLE error_reports
  ADD CONSTRAINT order_number_length CHECK (length(trim(order_number)) > 0 AND length(order_number) <= 50),
  ADD CONSTRAINT afo_number_length CHECK (length(trim(afo_number)) > 0 AND length(afo_number) <= 50),
  ADD CONSTRAINT problem_desc_length CHECK (length(trim(problem_description)) >= 10 AND length(problem_description) <= 2000),
  ADD CONSTRAINT defective_qty_positive CHECK (defective_quantity > 0 AND defective_quantity <= 999999),
  ADD CONSTRAINT total_defective_qty_positive CHECK (total_defective_quantity > 0 AND total_defective_quantity <= 999999),
  ADD CONSTRAINT corrective_action_length CHECK (corrective_action IS NULL OR length(corrective_action) <= 2000),
  ADD CONSTRAINT detection_location_length CHECK (detection_location IS NULL OR length(detection_location) <= 100),
  ADD CONSTRAINT error_cause_length CHECK (length(trim(error_cause)) > 0 AND length(error_cause) <= 2000),
  ADD CONSTRAINT creator_name_length CHECK (length(trim(creator_name)) >= 2 AND length(creator_name) <= 100),
  ADD CONSTRAINT personal_number_length CHECK (personal_number IS NULL OR length(personal_number) <= 50),
  ADD CONSTRAINT rejection_reason_length CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 2000),
  ADD CONSTRAINT additional_info_length CHECK (additional_info IS NULL OR length(additional_info) <= 5000);

-- Profiles Constraints
ALTER TABLE profiles
  ADD CONSTRAINT name_length CHECK (length(trim(name)) >= 2 AND length(name) <= 100),
  ADD CONSTRAINT personal_number_length CHECK (personal_number IS NULL OR length(personal_number) <= 50);

-- Departments Constraints
ALTER TABLE departments
  ADD CONSTRAINT department_name_length CHECK (length(trim(name)) > 0 AND length(name) <= 100);

-- Machines Constraints
ALTER TABLE machines
  ADD CONSTRAINT machine_name_length CHECK (length(trim(name)) > 0 AND length(name) <= 100);

-- Add validation RLS policies for critical operations
-- These policies enforce validation rules at the database level

-- Validate error report creation
CREATE POLICY "Validate error report creation"
ON error_reports
FOR INSERT
TO authenticated
WITH CHECK (
  length(trim(order_number)) > 0 AND length(order_number) <= 50 AND
  length(trim(afo_number)) > 0 AND length(afo_number) <= 50 AND
  length(trim(problem_description)) >= 10 AND length(problem_description) <= 2000 AND
  length(trim(error_cause)) > 0 AND
  defective_quantity > 0 AND defective_quantity <= 999999 AND
  total_defective_quantity > 0 AND total_defective_quantity <= 999999 AND
  length(trim(creator_name)) >= 2 AND length(creator_name) <= 100 AND
  creator_id = auth.uid()
);

-- Validate error report updates
CREATE POLICY "Validate error report updates"
ON error_reports
FOR UPDATE
TO authenticated
USING (
  creator_id = auth.uid() OR 
  assigned_team_leader_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  length(trim(order_number)) > 0 AND length(order_number) <= 50 AND
  length(trim(afo_number)) > 0 AND length(afo_number) <= 50 AND
  length(trim(problem_description)) >= 10 AND length(problem_description) <= 2000 AND
  defective_quantity > 0 AND defective_quantity <= 999999 AND
  total_defective_quantity > 0 AND total_defective_quantity <= 999999
);

-- Validate profile updates
CREATE POLICY "Validate profile updates"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  length(trim(name)) >= 2 AND length(name) <= 100
);