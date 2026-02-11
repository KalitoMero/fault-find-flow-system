
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users } from 'lucide-react';
import api from '@/lib/apiClient';

interface Employee {
  id: string;
  name: string;
  departmentId: string;
}

interface DeputySelectionProps {
  currentUser: string;
  shouldShow: boolean;
}

const DeputySelection: React.FC<DeputySelectionProps> = ({ currentUser, shouldShow }) => {
  const [availableDeputies, setAvailableDeputies] = useState<Employee[]>([]);
  const [selectedDeputy, setSelectedDeputy] = useState<string>('none');

  useEffect(() => {
    if (shouldShow) {
      loadDeputies();
      loadSelectedDeputy();
    }
  }, [currentUser, shouldShow]);

  const loadDeputies = async () => {
    try {
      const meData = await api.get('/api/auth/me');
      if (!meData?.user) return;

      const profiles = await api.get('/api/profiles');
      const myProfile = profiles?.find((p: any) => p.id === meData.user.id);
      
      if (myProfile?.department_id) {
        const deputies = profiles
          ?.filter((p: any) => p.department_id === myProfile.department_id && p.id !== meData.user.id)
          .map((d: any) => ({ id: d.id, name: d.name, departmentId: d.department_id })) || [];
        
        setAvailableDeputies(deputies);
      }
    } catch (error) {
      console.error('DeputySelection: Error loading deputies:', error);
      setAvailableDeputies([]);
    }
  };

  const loadSelectedDeputy = async () => {
    try {
      const deputies = await api.get('/api/settings/deputies/list');
      const active = deputies?.find((d: any) => d.is_active);
      setSelectedDeputy(active?.deputy_id || 'none');
    } catch (error) {
      console.error('DeputySelection: Error loading saved deputy:', error);
      setSelectedDeputy('none');
    }
  };

  const handleDeputyChange = async (deputyId: string) => {
    setSelectedDeputy(deputyId);
    
    try {
      await api.put('/api/settings/deputies', {
        deputyId: deputyId !== 'none' ? deputyId : null,
      });
    } catch (error) {
      console.error('DeputySelection: Error updating deputy:', error);
    }
  };

  if (!shouldShow) return null;

  if (availableDeputies.length === 0) {
    return (
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Users className="h-5 w-5" />
            <span>Vertretung</span>
          </CardTitle>
          <CardDescription className="text-yellow-700">
            Keine Mitarbeiter mit Anmeldedaten in Ihrer Abteilung gefunden. 
            Erstellen Sie in den Einstellungen Accounts für Mitarbeiter, um eine Vertretung auswählen zu können.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="h-5 w-5" />
          <span>Vertretung auswählen</span>
        </CardTitle>
        <CardDescription>
          Wählen Sie einen Mitarbeiter aus Ihrer Abteilung als Vertretung aus. 
          Die Vertretung erhält Zugang zu allen Ihren Fehlermeldungen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-sm">
          <Label htmlFor="deputy-select">Vertretung</Label>
          <Select value={selectedDeputy} onValueChange={handleDeputyChange}>
            <SelectTrigger id="deputy-select">
              <SelectValue placeholder="Vertretung auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Keine Vertretung</SelectItem>
              {availableDeputies.map((deputy) => (
                <SelectItem key={deputy.id} value={deputy.id}>
                  {deputy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDeputy && selectedDeputy !== 'none' && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Vertretung aktiv: {availableDeputies.find(d => d.id === selectedDeputy)?.name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeputySelection;
