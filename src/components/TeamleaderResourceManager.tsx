import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getTeamLeaderResources, saveTeamLeaderResources } from '@/lib/resourceStorage';
import { extractResourcesFromExcel, normalizeResourceName } from '@/lib/resourceUtils';
import api from '@/lib/apiClient';
import type { Employee } from '@/lib/employeeManagement';

interface TeamleaderResourceManagerProps {
  teamLeaders: Employee[];
}

export const TeamleaderResourceManager = ({ teamLeaders }: TeamleaderResourceManagerProps) => {
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string | null>(null);
  const [selectedTeamLeaderName, setSelectedTeamLeaderName] = useState<string>('');
  const [assignedResources, setAssignedResources] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [customResource, setCustomResource] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Lade verfügbare Ressourcen aus Excel
  useEffect(() => {
    loadAvailableResources();
  }, []);
  
  const loadAvailableResources = async () => {
    try {
      const settings = await api.get('/api/excel/settings');
      
      if (settings?.resource_column) {
        const resources = await extractResourcesFromExcel(settings.resource_column);
        setAvailableResources(resources);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ressourcen:', error);
    }
  };
  
  const handleOpenDialog = async (teamLeaderId: string, teamLeaderName: string) => {
    setSelectedTeamLeader(teamLeaderId);
    setSelectedTeamLeaderName(teamLeaderName);
    const resources = await getTeamLeaderResources(teamLeaderId);
    setAssignedResources(resources);
    setIsDialogOpen(true);
  };
  
  const handleSaveResources = async () => {
    if (!selectedTeamLeader) return;
    
    try {
      await saveTeamLeaderResources(selectedTeamLeader, assignedResources);
      toast.success('Ressourcen erfolgreich gespeichert');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern');
    }
  };
  
  const handleAddCustomResource = () => {
    if (customResource.trim()) {
      const normalized = normalizeResourceName(customResource);
      if (!assignedResources.includes(normalized)) {
        setAssignedResources(prev => [...prev, normalized].sort());
      }
      setCustomResource('');
    }
  };
  
  const handleToggleResource = (resource: string, checked: boolean) => {
    if (checked) {
      setAssignedResources(prev => [...prev, resource].sort());
    } else {
      setAssignedResources(prev => prev.filter(r => r !== resource));
    }
  };
  
  const handleRemoveResource = (resource: string) => {
    setAssignedResources(prev => prev.filter(r => r !== resource));
  };
  
  return (
    <div className="space-y-4">
      {teamLeaders.map(tl => (
        <Card key={tl.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{tl.name}</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => handleOpenDialog(tl.id, tl.name)}
              >
                Ressourcen
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
      
      {/* Dialog für Ressourcen-Auswahl */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ressourcen zuordnen - {selectedTeamLeaderName}</DialogTitle>
          </DialogHeader>
          
          {/* Multi-Select für verfügbare Ressourcen */}
          <div className="space-y-4">
            <div>
              <Label>Verfügbare Ressourcen (aus Excel)</Label>
              {availableResources.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Keine Ressourcen gefunden. Bitte Excel-Datei hochladen und Ressourcen-Spalte konfigurieren.
                </p>
              ) : (
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto mt-2">
                  {availableResources.map(resource => (
                    <div key={resource} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        checked={assignedResources.includes(resource)}
                        onCheckedChange={(checked) => handleToggleResource(resource, checked as boolean)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => handleToggleResource(resource, !assignedResources.includes(resource))}>
                        {resource}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Manuell Ressource hinzufügen */}
            <div className="space-y-2">
              <Label>Manuelle Ressource hinzufügen</Label>
              <div className="flex gap-2">
                <Input
                  value={customResource}
                  onChange={(e) => setCustomResource(e.target.value)}
                  placeholder="Ressourcen-Name..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomResource()}
                />
                <Button onClick={handleAddCustomResource}>Hinzufügen</Button>
              </div>
            </div>
            
            {/* Zugeordnete Ressourcen anzeigen */}
            <div>
              <Label>Zugeordnet ({assignedResources.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {assignedResources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Ressourcen zugeordnet</p>
                ) : (
                  assignedResources.map(resource => (
                    <Badge key={resource} variant="secondary" className="cursor-pointer">
                      {resource}
                      <button
                        onClick={() => handleRemoveResource(resource)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveResources}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
