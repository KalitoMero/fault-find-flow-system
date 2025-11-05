-- Add edited_at column to error_reports table
ALTER TABLE error_reports ADD COLUMN edited_at timestamp with time zone;

-- Add edited_by_id column to track who edited the report
ALTER TABLE error_reports ADD COLUMN edited_by_id uuid REFERENCES auth.users(id);