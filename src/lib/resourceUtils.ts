import api from '@/lib/apiClient';

/**
 * Normalisiert Ressourcen-Namen für konsistente Vergleiche
 */
export const normalizeResourceName = (name: string): string => {
  return name.trim().toLowerCase();
};

/**
 * Extrahiert alle einzigartigen Ressourcen aus Excel-Daten
 */
export const extractResourcesFromExcel = async (resourceColumn: string): Promise<string[]> => {
  try {
    const data = await api.get('/api/excel/data');
    if (!data || data.length === 0) return [];

    const resources = new Set<string>();
    data.forEach((row: any) => {
      const resourceValue = row.row_data?.[resourceColumn];
      if (resourceValue && typeof resourceValue === 'string') {
        resources.add(normalizeResourceName(resourceValue));
      }
    });

    return Array.from(resources).sort();
  } catch {
    return [];
  }
};
