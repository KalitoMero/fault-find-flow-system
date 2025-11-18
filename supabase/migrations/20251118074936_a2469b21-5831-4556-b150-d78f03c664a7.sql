-- Migration: Add resource-based team leader assignment

-- 1. Create teamleader_resources table
CREATE TABLE IF NOT EXISTS public.teamleader_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamleader_id UUID NOT NULL,
  resource_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teamleader_resources_resource ON public.teamleader_resources(resource_name);
CREATE INDEX IF NOT EXISTS idx_teamleader_resources_teamleader ON public.teamleader_resources(teamleader_id);

-- Enable RLS
ALTER TABLE public.teamleader_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teamleader_resources
CREATE POLICY "Authenticated users can view teamleader resources"
  ON public.teamleader_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage teamleader resources"
  ON public.teamleader_resources FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add resource_column to excel_settings
ALTER TABLE public.excel_settings 
ADD COLUMN IF NOT EXISTS resource_column TEXT;

-- 3. Add resource_name to error_reports
ALTER TABLE public.error_reports 
ADD COLUMN IF NOT EXISTS resource_name TEXT;