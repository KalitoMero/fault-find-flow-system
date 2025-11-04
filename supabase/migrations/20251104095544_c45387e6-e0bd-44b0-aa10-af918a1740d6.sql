-- Step 1: Add 'management' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'management';