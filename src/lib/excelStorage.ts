import { supabase } from '@/integrations/supabase/client';

interface ExcelColumn {
  name: string;
  column: string;
}

interface ExcelSettings {
  orderNumberColumn: string;
  afoNumberColumn: string;
  articleNumberColumn?: string;
  articleDescriptionColumn?: string;
  departmentColumn?: string;
  resourceColumn?: string;
  additionalColumns: ExcelColumn[];
  fileName?: string;
  rowCount?: number;
  columnOrder?: string[];
  orderColumnName?: string;
  afoColumnName?: string;
  articleColumnName?: string;
  articleDescriptionColumnName?: string;
  departmentColumnName?: string;
}

interface ExcelData {
  data: any[];
  settings: ExcelSettings;
}

export const saveExcelData = async (data: any[]): Promise<void> => {
  try {
    // Clear existing data first using fast TRUNCATE function
    console.log('Clearing old Excel data...');
    const { error: clearError } = await supabase.rpc('clear_excel_data');

    if (clearError) {
      console.error('Error clearing old data:', clearError);
      throw new Error(`Fehler beim Löschen alter Daten: ${clearError.message}`);
    }
    
    console.log('✅ Old data cleared');

    // Insert new data in batches (Supabase has a limit)
    // Include row_index to preserve original order
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map((row, index) => ({
        row_data: row,
        row_index: i + index // Preserve original order
      }));

      console.log(`Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}...`);
      
      const { error } = await supabase
        .from('excel_data')
        .insert(batch);

      if (error) {
        console.error('Insert error:', error);
        throw new Error(`Fehler beim Speichern von Zeilen ${i}-${i + batch.length}: ${error.message}`);
      }
    }

    console.log(`✅ Excel data saved to Supabase: ${data.length} rows`);
  } catch (error) {
    console.error('Error saving Excel data:', error);
    throw error;
  }
};

export const saveExcelSettings = async (settings: ExcelSettings): Promise<void> => {
  try {
    // Settings are cleared by clear_excel_data() function, no need to clear again
    // Insert new settings
    const { error } = await supabase
      .from('excel_settings')
      .insert({
        order_number_column: settings.orderNumberColumn,
        afo_number_column: settings.afoNumberColumn,
        article_number_column: settings.articleNumberColumn,
        article_description_column: settings.articleDescriptionColumn,
        department_column: settings.departmentColumn,
        resource_column: settings.resourceColumn,
        additional_columns: JSON.stringify(settings.additionalColumns),
        file_name: settings.fileName,
        row_count: settings.rowCount,
        column_order: settings.columnOrder ? JSON.stringify(settings.columnOrder) : null
      });

    if (error) {
      console.error('Error inserting settings:', error);
      throw new Error(`Fehler beim Speichern der Einstellungen: ${error.message}`);
    }
    
    console.log('✅ Excel settings saved');
  } catch (error) {
    console.error('Error saving Excel settings:', error);
    throw error;
  }
};

export const getExcelData = async (): Promise<ExcelData | null> => {
  try {
    const settings = await getExcelSettings();
    if (!settings) {
      return null;
    }

    // Load all data in batches using row_index for reliable pagination
    let allData: any[] = [];
    let lastRowIndex = -1;
    const batchSize = 1000;
    
    console.log('Loading Excel data in batches...');
    
    while (true) {
      const { data, error } = await supabase
        .from('excel_data')
        .select('row_data, row_index')
        .gt('row_index', lastRowIndex)
        .order('row_index', { ascending: true })
        .limit(batchSize);

      if (error) {
        console.error('Error loading batch:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No more data to load');
        break;
      }

      console.log(`Loaded batch: ${data.length} rows (row_index ${data[0].row_index} - ${data[data.length - 1].row_index})`);
      
      allData = allData.concat(data);
      lastRowIndex = data[data.length - 1].row_index;
      
      // If we got less than batchSize rows, we've reached the end
      if (data.length < batchSize) {
        console.log('Reached end of data');
        break;
      }
    }

    if (allData.length === 0) {
      console.log('No Excel data found');
      return null;
    }

    console.log(`✅ Loaded ${allData.length} rows from database`);

    return {
      data: allData.map((row: any) => row.row_data),
      settings
    };
  } catch (error) {
    console.error('Error loading Excel data:', error);
    return null;
  }
};

export const getExcelSettings = async (): Promise<ExcelSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('excel_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return null;
    }

    return {
      orderNumberColumn: data.order_number_column,
      afoNumberColumn: data.afo_number_column,
      articleNumberColumn: data.article_number_column,
      articleDescriptionColumn: data.article_description_column,
      departmentColumn: data.department_column,
      resourceColumn: data.resource_column,
      additionalColumns: typeof data.additional_columns === 'string' 
        ? JSON.parse(data.additional_columns) 
        : (Array.isArray(data.additional_columns) ? data.additional_columns : []),
      fileName: data.file_name,
      rowCount: data.row_count,
      columnOrder: data.column_order 
        ? (typeof data.column_order === 'string' ? JSON.parse(data.column_order) : data.column_order)
        : undefined,
      orderColumnName: data.order_number_column,
      afoColumnName: data.afo_number_column,
      articleColumnName: data.article_number_column,
      articleDescriptionColumnName: data.article_description_column,
      departmentColumnName: data.department_column
    };
  } catch (error) {
    console.error('Error loading Excel settings:', error);
    return null;
  }
};

export const clearExcelData = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('clear_excel_data');
    if (error) throw error;
  } catch (error) {
    console.error('Error clearing Excel data:', error);
    throw error;
  }
};
