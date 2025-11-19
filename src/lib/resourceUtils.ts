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
 * Verwendet Batching um alle Zeilen zu verarbeiten (nicht nur erste 1000)
 */
export const extractResourcesFromExcel = async (resourceColumn: string): Promise<string[]> => {
  const resources = new Set<string>();
  let lastRowIndex = -1;
  const batchSize = 1000;
  
  console.log('Extracting resources from Excel in batches...');
  
  while (true) {
    const { data, error } = await supabase
      .from('excel_data')
      .select('row_data, row_index')
      .gt('row_index', lastRowIndex)
      .order('row_index', { ascending: true })
      .limit(batchSize);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('No more data to process');
      break;
    }

    console.log(`Processing batch: ${data.length} rows (row_index ${data[0].row_index} - ${data[data.length - 1].row_index})`);
    
    // Extract resources from this batch
    data.forEach(row => {
      const resourceValue = row.row_data?.[resourceColumn];
      if (resourceValue && typeof resourceValue === 'string') {
        resources.add(normalizeResourceName(resourceValue));
      }
    });
    
    lastRowIndex = data[data.length - 1].row_index;
    
    // If we got less than batchSize rows, we've reached the end
    if (data.length < batchSize) {
      console.log('Reached end of data');
      break;
    }
  }
  
  console.log(`✅ Extracted ${resources.size} unique resources from all Excel rows`);
  return Array.from(resources).sort();
};
