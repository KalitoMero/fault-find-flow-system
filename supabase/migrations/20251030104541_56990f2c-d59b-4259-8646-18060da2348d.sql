-- Create indexes for fast Excel data search
CREATE INDEX IF NOT EXISTS idx_excel_data_row_index 
ON public.excel_data (row_index);

-- Create RPC function for server-side Excel search
CREATE OR REPLACE FUNCTION public.search_excel_row(
  p_order_number text,
  p_afo_number text,
  p_order_column text,
  p_afo_column text,
  p_article_column text DEFAULT NULL,
  p_article_desc_column text DEFAULT NULL,
  p_department_column text DEFAULT NULL,
  p_additional_columns jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_row record;
  v_additional_data jsonb := '{}'::jsonb;
  v_col jsonb;
BEGIN
  -- Search for matching row
  SELECT * INTO v_row
  FROM excel_data
  WHERE row_data->>p_order_column = trim(p_order_number)
    AND row_data->>p_afo_column = trim(p_afo_number)
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
$$;