-- Fix infinite recursion in profiles RLS policies
-- Create security definer function to get user's department without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _user_id
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Team leaders can view department profiles" ON profiles;

-- Recreate the policy using the security definer function to avoid recursion
CREATE POLICY "Team leaders can view department profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teamleader'::app_role) AND 
  department_id = get_user_department(auth.uid())
);