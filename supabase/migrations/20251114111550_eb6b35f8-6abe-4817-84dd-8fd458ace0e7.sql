-- Update search_excel_row function to normalize input for flexible searching
-- This allows searching regardless of hyphen or space formatting
CREATE OR REPLACE FUNCTION public.search_excel_row(
  p_order_number text, 
  p_afo_number text, 
  p_order_column text, 
  p_afo_column text, 
  p_article_column text DEFAULT NULL::text, 
  p_article_desc_column text DEFAULT NULL::text, 
  p_department_column text DEFAULT NULL::text, 
  p_additional_columns jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_row record;
  v_additional_data jsonb := '{}'::jsonb;
  v_col jsonb;
BEGIN
  -- Search for matching row with normalized comparison (remove hyphens and spaces)
  SELECT * INTO v_row
  FROM excel_data
  WHERE REPLACE(REPLACE(row_data->>p_order_column, '-', ''), ' ', '') = REPLACE(REPLACE(trim(p_order_number), '-', ''), ' ', '')
    AND REPLACE(REPLACE(row_data->>p_afo_column, '-', ''), ' ', '') = REPLACE(REPLACE(trim(p_afo_number), '-', ''), ' ', '')
  ORDER BY row_index
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build additional data object
  IF p_article_column IS NOT NULL AND v_row.row_data->>p_article_column IS NOT NULL THEN
    v_additional_data := jsonb_set(v_additional_data, '{Artikelnummer}', to_jsonb(v_row.row_data->>p_article_column));
  END IF;
  
  IF p_article_desc_column IS NOT NULL AND v_row.row_data->>p_article_desc_column IS NOT NULL THEN
    v_additional_data := jsonb_set(v_additional_data, '{Artikelbezeichnung}', to_jsonb(v_row.row_data->>p_article_desc_column));
  END IF;
  
  -- Add custom additional columns
  FOR v_col IN SELECT * FROM jsonb_array_elements(p_additional_columns)
  LOOP
    IF v_row.row_data->>(v_col->>'column') IS NOT NULL THEN
      v_additional_data := jsonb_set(
        v_additional_data, 
        array[v_col->>'name'], 
        to_jsonb(v_row.row_data->>(v_col->>'column'))
      );
    END IF;
  END LOOP;
  
  -- Build result
  v_result := jsonb_build_object(
    'row', v_row.row_data,
    'additionalData', v_additional_data,
    'department', CASE 
      WHEN p_department_column IS NOT NULL 
      THEN v_row.row_data->>p_department_column 
      ELSE NULL 
    END
  );
  
  RETURN v_result;
END;
$function$;