-- Add code column to departments table for short codes like "FRÄ"
ALTER TABLE public.departments 
ADD COLUMN code TEXT UNIQUE;

-- Add comment to explain the columns
COMMENT ON COLUMN public.departments.code IS 'Short department code used in Excel and internal systems (e.g., FRÄ)';
COMMENT ON COLUMN public.departments.name IS 'Full display name of the department (e.g., Fräsen)';

-- Update existing departments if any exist (example data - adjust as needed)
-- Users can add their actual departments later
UPDATE public.departments 
SET code = UPPER(LEFT(name, 3)) 
WHERE code IS NULL;
