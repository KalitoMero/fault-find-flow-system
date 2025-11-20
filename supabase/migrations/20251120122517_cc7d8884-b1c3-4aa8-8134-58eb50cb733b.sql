-- Make all user-related columns in error_reports nullable
ALTER TABLE error_reports ALTER COLUMN approved_by_id DROP NOT NULL;
ALTER TABLE error_reports ALTER COLUMN rejected_by_id DROP NOT NULL;
ALTER TABLE error_reports ALTER COLUMN edited_by_id DROP NOT NULL;

-- Drop existing foreign key constraints if they exist
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_approved_by_id_fkey;
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_rejected_by_id_fkey;
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_edited_by_id_fkey;
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_assigned_team_leader_id_fkey;

-- Add new foreign key constraints with ON DELETE SET NULL
ALTER TABLE error_reports 
ADD CONSTRAINT error_reports_approved_by_id_fkey 
FOREIGN KEY (approved_by_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE error_reports 
ADD CONSTRAINT error_reports_rejected_by_id_fkey 
FOREIGN KEY (rejected_by_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE error_reports 
ADD CONSTRAINT error_reports_edited_by_id_fkey 
FOREIGN KEY (edited_by_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE error_reports 
ADD CONSTRAINT error_reports_assigned_team_leader_id_fkey 
FOREIGN KEY (assigned_team_leader_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;