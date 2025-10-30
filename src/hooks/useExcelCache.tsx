import { useState, useEffect, useCallback, useRef } from 'react';
import { getExcelData } from '@/lib/excelStorage';

interface ExcelSettings {
  orderNumberColumn: string;
  afoNumberColumn: string;
  articleNumberColumn?: string;
  articleDescriptionColumn?: string;
  departmentColumn?: string;
  additionalColumns: Array<{ name: string; column: string }>;
  fileName?: string;
  rowCount?: number;
}

interface ExcelCacheData {
  data: any[];
  settings: ExcelSettings;
}

interface ExcelSearchResult {
  row: any;
  additionalData: Record<string, any>;
  department?: string;
}

let globalExcelCache: ExcelCacheData | null = null;
let globalCachePromise: Promise<ExcelCacheData | null> | null = null;
let globalIsLoading = false;

export const useExcelCache = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load Excel data once globally
  const loadCache = useCallback(async () => {
    // If already loaded, just mark as ready
    if (globalExcelCache) {
      setIsReady(true);
      return globalExcelCache;
    }

    // If currently loading, wait for existing promise
    if (globalCachePromise) {
      setIsLoading(true);
      const result = await globalCachePromise;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsReady(!!result);
      }
      return result;
    }

    // Start new load
    globalIsLoading = true;
    setIsLoading(true);
    
    console.log('🔄 Loading Excel data into cache...');
    const startTime = performance.now();
    
    globalCachePromise = getExcelData();
    
    try {
      const result = await globalCachePromise;
      globalExcelCache = result;
      
      const loadTime = Math.round(performance.now() - startTime);
      
      if (result) {
        console.log(`✅ Excel cache loaded: ${result.data.length} rows in ${loadTime}ms`);
      } else {
        console.log('⚠️ No Excel data found');
      }
      
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsReady(!!result);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error loading Excel cache:', error);
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsReady(false);
      }
      return null;
    } finally {
      globalIsLoading = false;
      globalCachePromise = null;
    }
  }, []);

  // Search for matching row by order and AFO number
  const searchExcelData = useCallback(async (
    orderNumber: string, 
    afoNumber?: string
  ): Promise<ExcelSearchResult | null> => {
    const cache = globalExcelCache || await loadCache();
    
    if (!cache || !cache.data.length) {
      return null;
    }

    const { data, settings } = cache;
    const headers = Object.keys(data[0]);
    
    const orderColumnIndex = parseInt(settings.orderNumberColumn) - 1;
    const afoColumnIndex = parseInt(settings.afoNumberColumn) - 1;
    const articleColumnIndex = settings.articleNumberColumn ? parseInt(settings.articleNumberColumn) - 1 : null;
    const articleDescriptionColumnIndex = settings.articleDescriptionColumn ? parseInt(settings.articleDescriptionColumn) - 1 : null;
    const departmentColumnIndex = settings.departmentColumn ? parseInt(settings.departmentColumn) - 1 : null;
    
    const orderColumnName = headers[orderColumnIndex];
    const afoColumnName = headers[afoColumnIndex];
    const articleColumnName = articleColumnIndex !== null ? headers[articleColumnIndex] : null;
    const articleDescriptionColumnName = articleDescriptionColumnIndex !== null ? headers[articleDescriptionColumnIndex] : null;
    const departmentColumnName = departmentColumnIndex !== null ? headers[departmentColumnIndex] : null;

    // Find matching row where both numbers match
    const matchingRow = data.find(row => {
      const orderValue = row[orderColumnName]?.toString().trim();
      const afoValue = row[afoColumnName]?.toString().trim();
      const orderMatch = orderValue === orderNumber.toString().trim();
      const afoMatch = afoNumber && afoValue === afoNumber.toString().trim();
      return orderMatch && afoMatch;
    });

    if (!matchingRow) {
      return null;
    }

    // Collect additional data
    const additionalData: Record<string, any> = {};
    
    if (articleColumnName && matchingRow[articleColumnName]) {
      additionalData.Artikelnummer = matchingRow[articleColumnName];
    }
    
    if (articleDescriptionColumnName && matchingRow[articleDescriptionColumnName]) {
      additionalData.Artikelbezeichnung = matchingRow[articleDescriptionColumnName];
    }
    
    settings.additionalColumns.forEach(col => {
      const colIndex = parseInt(col.column) - 1;
      const colName = headers[colIndex];
      const value = matchingRow[colName];
      
      if (value !== undefined && value !== null && value !== '') {
        additionalData[col.name] = value;
      }
    });

    const department = departmentColumnName ? matchingRow[departmentColumnName] : undefined;

    return {
      row: matchingRow,
      additionalData,
      department
    };
  }, [loadCache]);

  // Force refresh cache
  const refreshCache = useCallback(async () => {
    console.log('🔄 Refreshing Excel cache...');
    globalExcelCache = null;
    globalCachePromise = null;
    return await loadCache();
  }, [loadCache]);

  // Auto-load on mount
  useEffect(() => {
    if (!globalExcelCache && !globalIsLoading) {
      loadCache();
    } else if (globalExcelCache) {
      setIsReady(true);
    }
  }, [loadCache]);

  return {
    isLoading,
    isReady,
    searchExcelData,
    refreshCache,
    hasData: !!globalExcelCache?.data.length
  };
};
