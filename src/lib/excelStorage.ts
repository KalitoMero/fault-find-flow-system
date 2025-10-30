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
  additionalColumns: ExcelColumn[];
  fileName?: string;
  rowCount?: number;
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
    // Clear existing data first - delete ALL rows
    console.log('Deleting old Excel data...');
    const { error: deleteError, count: deletedCount } = await supabase
      .from('excel_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting old data:', deleteError);
      throw new Error(`Fehler beim Löschen alter Daten: ${deleteError.message}`);
    }
    
    console.log(`Deleted ${deletedCount || 'all'} old rows`);

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
    // Clear existing settings first
    console.log('Deleting old Excel settings...');
    const { error: deleteError } = await supabase
      .from('excel_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting old settings:', deleteError);
      throw new Error(`Fehler beim Löschen alter Einstellungen: ${deleteError.message}`);
    }

    // Insert new settings
    const { error } = await supabase
      .from('excel_settings')
      .insert({
        order_number_column: settings.orderNumberColumn,
        afo_number_column: settings.afoNumberColumn,
        article_number_column: settings.articleNumberColumn,
        article_description_column: settings.articleDescriptionColumn,
        department_column: settings.departmentColumn,
        additional_columns: JSON.stringify(settings.additionalColumns),
        file_name: settings.fileName,
        row_count: settings.rowCount
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

    const { data, error } = await supabase
      .from('excel_data')
      .select('row_data')
      .order('row_index', { ascending: true }); // Sort by row_index to preserve order

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    return {
      data: data.map((row: any) => row.row_data),
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
      additionalColumns: typeof data.additional_columns === 'string' 
        ? JSON.parse(data.additional_columns) 
        : (Array.isArray(data.additional_columns) ? data.additional_columns : []),
      fileName: data.file_name,
      rowCount: data.row_count,
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
    await supabase.from('excel_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('excel_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error('Error clearing Excel data:', error);
    throw error;
  }
};
