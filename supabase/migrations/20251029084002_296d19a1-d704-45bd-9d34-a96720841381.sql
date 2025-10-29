-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add constraint to ensure username is not empty when set
ALTER TABLE public.profiles 
ADD CONSTRAINT username_not_empty CHECK (username IS NULL OR length(trim(username)) > 0);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update existing profiles to have a default username based on their name
UPDATE public.profiles 
SET username = lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))
WHERE username IS NULL AND name IS NOT NULL;

-- For profiles without a name, use id as username
UPDATE public.profiles 
SET username = 'user_' || substring(id::text, 1, 8)
WHERE username IS NULL;