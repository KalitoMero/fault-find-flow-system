import { supabase } from '@/integrations/supabase/client';

/**
 * Normalisiert Ressourcen-Namen für konsistente Vergleiche
 * - Kleinbuchstaben
 * - Trimming (Leerzeichen entfernen)
 */
export const normalizeResourceName = (name: string): string => {
  return name.trim().toLowerCase();
};

/**
 * Extrahiert alle einzigartigen Ressourcen aus Excel-Daten
 */
export const extractResourcesFromExcel = async (resourceColumn: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('excel_data')
    .select('row_data');
  
  if (error) throw error;
  
  const resources = new Set<string>();
  data?.forEach(row => {
    const resourceValue = row.row_data?.[resourceColumn];
    if (resourceValue && typeof resourceValue === 'string') {
      resources.add(normalizeResourceName(resourceValue));
    }
  });
  
  return Array.from(resources).sort();
};
