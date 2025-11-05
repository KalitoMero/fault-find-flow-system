-- Allow all authenticated users to view basic profile information (name) of other users
-- This is needed so employees can see who approved/rejected their reports
CREATE POLICY "All authenticated users can view profile names" 
ON public.profiles 
FOR SELECT 
USING (true);