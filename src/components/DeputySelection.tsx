
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');

  useEffect(() => {
    if (shouldShow) {
      console.log('DeputySelection: Loading deputies for user:', currentUser);
      loadDeputies();
      loadSelectedDeputy();
    }
  }, [currentUser, shouldShow]);

  const loadDeputies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, name, department_id')
        .eq('id', user.id)
        .single();
      
      if (currentProfile) {
        console.log('DeputySelection: Current employee found:', currentProfile.name);
        setCurrentUserDepartment(currentProfile.department_id);
        
        // Get other employees from the same department with user roles
        const { data: deputies } = await supabase
          .from('profiles')
          .select('id, name, department_id')
          .eq('department_id', currentProfile.department_id)
          .neq('id', user.id);
        
        console.log('DeputySelection: Available deputies:', deputies?.length || 0);
        setAvailableDeputies(deputies?.map(d => ({
          id: d.id,
          name: d.name,
          departmentId: d.department_id
        })) || []);
      }
    } catch (error) {
      console.error('DeputySelection: Error loading deputies:', error);
      setAvailableDeputies([]);
    }
  };

  const loadSelectedDeputy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignment } = await supabase
        .from('deputy_assignments')
        .select('deputy_id')
        .eq('team_leader_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (assignment?.deputy_id) {
        console.log('DeputySelection: Loaded saved deputy:', assignment.deputy_id);
        setSelectedDeputy(assignment.deputy_id);
      } else {
        setSelectedDeputy('none');
      }
    } catch (error) {
      console.error('DeputySelection: Error loading saved deputy:', error);
      setSelectedDeputy('none');
    }
  };

  const handleDeputyChange = async (deputyId: string) => {
    console.log('DeputySelection: Deputy changed to:', deputyId);
    setSelectedDeputy(deputyId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (deputyId && deputyId !== 'none') {
        // Deactivate old assignments
        await supabase
          .from('deputy_assignments')
          .update({ is_active: false })
          .eq('team_leader_id', user.id);
        
        // Create new assignment
        await supabase
          .from('deputy_assignments')
          .insert({
            team_leader_id: user.id,
            deputy_id: deputyId,
            is_active: true
          });
      } else {
        // Deactivate all assignments
        await supabase
          .from('deputy_assignments')
          .update({ is_active: false })
          .eq('team_leader_id', user.id);
      }
    } catch (error) {
      console.error('DeputySelection: Error updating deputy:', error);
    }
  };

  // Nicht anzeigen wenn shouldShow false ist
  if (!shouldShow) {
    return null;
  }

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
