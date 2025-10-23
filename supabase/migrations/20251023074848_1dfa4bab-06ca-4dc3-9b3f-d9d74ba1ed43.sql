-- Create table for N8N webhook settings
CREATE TABLE IF NOT EXISTS public.n8n_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.n8n_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own N8N settings
CREATE POLICY "Users can view own N8N settings"
ON public.n8n_settings
FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own N8N settings"
ON public.n8n_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own N8N settings"
ON public.n8n_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all N8N settings"
ON public.n8n_settings
FOR ALL
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_n8n_settings_updated_at
BEFORE UPDATE ON public.n8n_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();