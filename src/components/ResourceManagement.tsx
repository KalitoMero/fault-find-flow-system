import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { extractResourcesFromExcel, normalizeResourceName } from '@/lib/resourceUtils';
import { supabase } from '@/integrations/supabase/client';

export const ResourceManagement = () => {
  const [resources, setResources] = useState<string[]>([]);
  const [newResource, setNewResource] = useState('');
  const [resourceAssignments, setResourceAssignments] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadResources();
  }, []);
  
  const loadResources = async () => {
    try {
      setIsLoading(true);
      
      // Ressourcen aus Excel laden
      const { data: settings } = await supabase
        .from('excel_settings')
        .select('resource_column')
        .limit(1)
        .maybeSingle();
      
      let excelResources: string[] = [];
      if (settings?.resource_column) {
        excelResources = await extractResourcesFromExcel(settings.resource_column);
      }
      
      // Manuell hinzugefügte Ressourcen laden (alle aus teamleader_resources)
      const { data: manualResourcesData } = await supabase
        .from('teamleader_resources')
        .select('resource_name');
      
      const manualResources = [...new Set(manualResourcesData?.map(r => r.resource_name) || [])];
      
      // Kombinieren und deduplizieren
      const allResources = [...new Set([...excelResources, ...manualResources])].sort();
      setResources(allResources);
      
      // Zuordnungen laden
      await loadResourceAssignments(allResources);
    } catch (error) {
      console.error('Fehler beim Laden der Ressourcen:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadResourceAssignments = async (resourceList: string[]) => {
    const assignments = new Map<string, string[]>();
    
    for (const resource of resourceList) {
      const { data } = await supabase
        .from('teamleader_resources')
        .select(`
          teamleader_id,
          profiles!teamleader_resources_teamleader_id_fkey(name)
        `)
        .eq('resource_name', resource);
      
      const teamLeaderNames = data?.map((d: any) => d.profiles?.name).filter(Boolean) || [];
      assignments.set(resource, teamLeaderNames);
    }
    
    setResourceAssignments(assignments);
  };
  
  const handleAddResource = () => {
    if (newResource.trim()) {
      const normalized = normalizeResourceName(newResource);
      if (!resources.includes(normalized)) {
        setResources(prev => [...prev, normalized].sort());
      }
      setNewResource('');
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-4">Laden...</div>;
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ressourcenverwaltung</CardTitle>
          <CardDescription>
            Ressourcen werden automatisch aus Excel geladen. 
            Sie können auch manuell Ressourcen hinzufügen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Neue Ressource hinzufügen */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newResource}
              onChange={(e) => setNewResource(e.target.value)}
              placeholder="Neue Ressource..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddResource()}
            />
            <Button onClick={handleAddResource}>Hinzufügen</Button>
          </div>
          
          {/* Ressourcen-Liste */}
          <div className="space-y-2">
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Ressourcen gefunden. Bitte Excel-Datei hochladen und Ressourcen-Spalte konfigurieren.
              </p>
            ) : (
              resources.map(resource => (
                <Card key={resource}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{resource}</h4>
                        <p className="text-sm text-muted-foreground">
                          {resourceAssignments.get(resource)?.length || 0} Teamleiter zugeordnet
                        </p>
                        {resourceAssignments.get(resource)?.map(name => (
                          <Badge key={name} variant="outline" className="mr-1 mt-1">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
