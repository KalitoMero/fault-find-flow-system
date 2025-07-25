interface ExcelColumn {
  name: string;
  column: string;
}

interface ExcelSettings {
  orderNumberColumn: string;
  afoNumberColumn: string;
  additionalColumns: ExcelColumn[];
}

interface ExcelData {
  data: any[];
  settings: ExcelSettings;
}

const EXCEL_STORAGE_KEY = 'errorReportExcelData';
const EXCEL_SETTINGS_KEY = 'errorReportExcelSettings';

export const saveExcelData = (data: any[]): void => {
  localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify(data));
};

export const saveExcelSettings = (settings: ExcelSettings): void => {
  localStorage.setItem(EXCEL_SETTINGS_KEY, JSON.stringify(settings));
};

export const getExcelData = (): ExcelData | null => {
  try {
    const data = localStorage.getItem(EXCEL_STORAGE_KEY);
    const settings = localStorage.getItem(EXCEL_SETTINGS_KEY);
    
    if (!data || !settings) {
      return null;
    }
    
    return {
      data: JSON.parse(data),
      settings: JSON.parse(settings)
    };
  } catch (error) {
    console.error('Error loading Excel data:', error);
    return null;
  }
};

export const getExcelSettings = (): ExcelSettings | null => {
  try {
    const settings = localStorage.getItem(EXCEL_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error loading Excel settings:', error);
    return null;
  }
};

export const clearExcelData = (): void => {
  localStorage.removeItem(EXCEL_STORAGE_KEY);
  localStorage.removeItem(EXCEL_SETTINGS_KEY);
};