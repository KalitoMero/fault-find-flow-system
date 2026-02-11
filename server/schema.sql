-- =============================================
-- Fehlermeldesystem - PostgreSQL Schema
-- Ohne Supabase-Abhängigkeiten
-- =============================================

-- Rollen-Enum
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'teamleader', 'employee', 'management');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- USERS (ersetzt auth.users von Supabase)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT,
  personal_number TEXT,
  department_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER ROLES
-- =============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- =============================================
-- DEPARTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign Key für profiles.department_id
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_department_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- =============================================
-- MACHINES
-- =============================================
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ERROR REPORTS
-- =============================================
CREATE TABLE IF NOT EXISTS error_reports (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  afo_number TEXT NOT NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  defective_quantity INTEGER NOT NULL,
  total_defective_quantity INTEGER NOT NULL,
  quantity_type TEXT,
  detection_location TEXT,
  problem_description TEXT NOT NULL,
  error_cause TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  personal_number TEXT,
  approval_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  assigned_team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  additional_info TEXT,
  additional_excel_data JSONB,
  resource_name TEXT,
  edited_at TIMESTAMPTZ,
  edited_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AUDIO FILES
-- =============================================
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT REFERENCES error_reports(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DEPUTY ASSIGNMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS deputy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_leader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deputy_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEAMLEADER RESOURCES
-- =============================================
CREATE TABLE IF NOT EXISTS teamleader_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamleader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXCEL DATA
-- =============================================
CREATE TABLE IF NOT EXISTS excel_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_data JSONB NOT NULL,
  row_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXCEL SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS excel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT,
  order_number_column TEXT,
  afo_number_column TEXT,
  article_number_column TEXT,
  article_description_column TEXT,
  department_column TEXT,
  resource_column TEXT,
  additional_columns JSONB,
  column_order JSONB,
  row_count INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- APP SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- N8N SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS n8n_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  webhook_url TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGER: updated_at automatisch aktualisieren
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für alle Tabellen mit updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'users', 'profiles', 'error_reports', 
      'excel_settings', 'app_settings', 'n8n_settings'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- =============================================
-- Standard-Admin erstellen (Passwort: admin123 - ÄNDERN!)
-- Passwort-Hash für 'admin123' mit bcrypt
-- =============================================
-- HINWEIS: Den Admin-User erstellst du über die API:
-- POST /api/auth/register mit { email, password, name }
-- Dann in der DB: INSERT INTO user_roles (user_id, role) VALUES ('<user-id>', 'admin');

CREATE INDEX IF NOT EXISTS idx_error_reports_order_number ON error_reports(order_number);
CREATE INDEX IF NOT EXISTS idx_error_reports_creator_id ON error_reports(creator_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_team_leader ON error_reports(assigned_team_leader_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_approval_status ON error_reports(approval_status);
CREATE INDEX IF NOT EXISTS idx_error_reports_department_id ON error_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_deputy_assignments_deputy ON deputy_assignments(deputy_id);
CREATE INDEX IF NOT EXISTS idx_deputy_assignments_leader ON deputy_assignments(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_teamleader_resources_leader ON teamleader_resources(teamleader_id);
CREATE INDEX IF NOT EXISTS idx_excel_data_row_index ON excel_data(row_index);
