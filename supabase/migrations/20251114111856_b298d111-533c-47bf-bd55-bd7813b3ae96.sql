-- Import all unique department codes from excel_data into departments table
-- This is a one-time data import operation

INSERT INTO public.departments (id, name, code, created_at)
SELECT 
  gen_random_uuid() as id,
  arbgkat_nr as name,
  arbgkat_nr as code,
  now() as created_at
FROM (
  SELECT DISTINCT row_data->>'arbgkat_nr' as arbgkat_nr
  FROM public.excel_data
  WHERE row_data->>'arbgkat_nr' IS NOT NULL
    AND trim(row_data->>'arbgkat_nr') != ''
) unique_departments
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.departments 
  WHERE code = unique_departments.arbgkat_nr 
    OR name = unique_departments.arbgkat_nr
)
ORDER BY arbgkat_nr;