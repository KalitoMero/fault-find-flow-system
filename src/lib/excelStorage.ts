import api from '@/lib/apiClient';

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
  // Clear and re-upload via API
  await api.delete('/api/excel/clear');

  // Send data in batches
  const batchSize = 500;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map((row, index) => ({
      row_data: row,
      row_index: i + index,
    }));
    await api.post('/api/excel/data', batch);
  }
  console.log(`✅ Excel data saved: ${data.length} rows`);
};

export const saveExcelSettings = async (settings: ExcelSettings): Promise<void> => {
  await api.post('/api/excel/settings', {
    order_number_column: settings.orderNumberColumn,
    afo_number_column: settings.afoNumberColumn,
    article_number_column: settings.articleNumberColumn,
    article_description_column: settings.articleDescriptionColumn,
    department_column: settings.departmentColumn,
    resource_column: settings.resourceColumn,
    additional_columns: settings.additionalColumns,
    file_name: settings.fileName,
    row_count: settings.rowCount,
    column_order: settings.columnOrder,
  });
};

export const getExcelData = async (): Promise<ExcelData | null> => {
  try {
    const settings = await getExcelSettings();
    if (!settings) return null;

    const data = await api.get('/api/excel/data');
    if (!data || data.length === 0) return null;

    return {
      data: data.map((row: any) => row.row_data),
      settings,
    };
  } catch {
    return null;
  }
};

export const getExcelSettings = async (): Promise<ExcelSettings | null> => {
  try {
    const data = await api.get('/api/excel/settings');
    if (!data) return null;

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
      departmentColumnName: data.department_column,
    };
  } catch {
    return null;
  }
};

export const clearExcelData = async (): Promise<void> => {
  await api.delete('/api/excel/clear');
};

export const getExcelDataByOrderNumber = async (orderNumber: string): Promise<Record<string, any> | null> => {
  try {
    const settings = await getExcelSettings();
    if (!settings?.orderNumberColumn) return null;

    // Use server-side search
    const data = await api.post('/api/excel/search', {
      orderNumber,
      afoNumber: '',
      orderColumn: settings.orderNumberColumn,
      afoColumn: settings.afoNumberColumn,
    });

    return data?.row || null;
  } catch {
    return null;
  }
};
