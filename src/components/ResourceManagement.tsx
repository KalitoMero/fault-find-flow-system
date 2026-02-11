import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { extractResourcesFromExcel, normalizeResourceName } from '@/lib/resourceUtils';
import api from '@/lib/apiClient';

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
      
      const settings = await api.get('/api/excel/settings');
      
      let excelResources: string[] = [];
      if (settings?.resource_column) {
        excelResources = await extractResourcesFromExcel(settings.resource_column);
      }
      
      // Load manually added resources
      const profiles = await api.get('/api/profiles');
      const teamLeaderIds = profiles?.filter((p: any) => p.isTeamLeader).map((p: any) => p.id) || [];
      
      const manualResources: string[] = [];
      for (const tlId of teamLeaderIds) {
        const res = await api.get(`/api/settings/resources/${tlId}`);
        res?.forEach((r: any) => {
          if (!manualResources.includes(r.resource_name)) {
            manualResources.push(r.resource_name);
          }
        });
      }
      
      const allResources = [...new Set([...excelResources, ...manualResources])].sort();
      setResources(allResources);
      
      // Load assignments
      const assignments = new Map<string, string[]>();
      for (const resource of allResources) {
        // Find team leaders for this resource
        const tls = profiles?.filter((p: any) => p.isTeamLeader) || [];
        const assignedNames: string[] = [];
        for (const tl of tls) {
          const tlResources = await api.get(`/api/settings/resources/${tl.id}`);
          if (tlResources?.some((r: any) => r.resource_name === resource)) {
            assignedNames.push(tl.name);
          }
        }
        assignments.set(resource, assignedNames);
      }
      setResourceAssignments(assignments);
    } catch (error) {
      console.error('Fehler beim Laden der Ressourcen:', error);
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex gap-2 mb-4">
            <Input
              value={newResource}
              onChange={(e) => setNewResource(e.target.value)}
              placeholder="Neue Ressource..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddResource()}
            />
            <Button onClick={handleAddResource}>Hinzufügen</Button>
          </div>
          
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
