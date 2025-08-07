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
  // New fields for easier data lookup
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

const EXCEL_STORAGE_KEY = 'errorReportExcelData';
const EXCEL_SETTINGS_KEY = 'errorReportExcelSettings';
const DB_NAME = 'ErrorReportDB';
const DB_VERSION = 1;
const STORE_NAME = 'excelData';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveExcelData = async (data: any[]): Promise<void> => {
  try {
    const dataString = JSON.stringify(data);
    
    // Try localStorage first for smaller data
    if (dataString.length < 4 * 1024 * 1024) { // 4MB threshold
      localStorage.setItem(EXCEL_STORAGE_KEY, dataString);
      console.log('Excel data saved to localStorage');
      return;
    }
    
    // Use IndexedDB for larger data
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(data, EXCEL_STORAGE_KEY);
      request.onsuccess = () => {
        console.log('Excel data saved to IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    
    // Clear localStorage if data was moved to IndexedDB
    localStorage.removeItem(EXCEL_STORAGE_KEY);
    
  } catch (error) {
    console.error('Error saving Excel data:', error);
    throw error;
  }
};

export const saveExcelSettings = (settings: ExcelSettings): void => {
  localStorage.setItem(EXCEL_SETTINGS_KEY, JSON.stringify(settings));
};

export const getExcelData = async (): Promise<ExcelData | null> => {
  try {
    const settings = localStorage.getItem(EXCEL_SETTINGS_KEY);
    if (!settings) {
      return null;
    }
    
    // Try localStorage first
    const localData = localStorage.getItem(EXCEL_STORAGE_KEY);
    if (localData) {
      return {
        data: JSON.parse(localData),
        settings: JSON.parse(settings)
      };
    }
    
    // Try IndexedDB if not in localStorage
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const data = await new Promise<any[]>((resolve, reject) => {
        const request = store.get(EXCEL_STORAGE_KEY);
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => reject(request.error);
      });
      
      if (data) {
        return {
          data,
          settings: JSON.parse(settings)
        };
      }
    } catch (dbError) {
      console.warn('IndexedDB not available, falling back to localStorage only');
    }
    
    return null;
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

export const clearExcelData = async (): Promise<void> => {
  localStorage.removeItem(EXCEL_STORAGE_KEY);
  localStorage.removeItem(EXCEL_SETTINGS_KEY);
  
  // Also clear IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(EXCEL_STORAGE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Could not clear IndexedDB data:', error);
  }
};