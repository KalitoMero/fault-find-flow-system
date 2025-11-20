-- Make creator_id nullable in error_reports table
ALTER TABLE error_reports ALTER COLUMN creator_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_creator_id_fkey;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE error_reports 
ADD CONSTRAINT error_reports_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;