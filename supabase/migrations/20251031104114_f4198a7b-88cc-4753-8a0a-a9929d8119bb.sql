-- Make N8N settings global (not user-specific)
-- Remove user_id requirement and make it a singleton table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own N8N settings" ON n8n_settings;
DROP POLICY IF EXISTS "Users can insert own N8N settings" ON n8n_settings;
DROP POLICY IF EXISTS "Users can update own N8N settings" ON n8n_settings;
DROP POLICY IF EXISTS "Admins can manage all N8N settings" ON n8n_settings;

-- Make user_id nullable (for backward compatibility)
ALTER TABLE n8n_settings ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure only one global settings row exists
CREATE UNIQUE INDEX IF NOT EXISTS n8n_settings_singleton ON n8n_settings ((1)) WHERE user_id IS NULL;

-- New RLS policies: All authenticated users can read, only admins can write
CREATE POLICY "All authenticated users can view N8N settings"
ON n8n_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert N8N settings"
ON n8n_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update N8N settings"
ON n8n_settings
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Only admins can delete N8N settings"
ON n8n_settings
FOR DELETE
TO authenticated
USING (is_admin());