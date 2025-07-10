
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users } from 'lucide-react';
import { getEmployees, getTeamLeadersByDepartment, Employee } from '@/lib/settingsStorage';

interface DeputySelectionProps {
  currentUser: string;
}

const DeputySelection: React.FC<DeputySelectionProps> = ({ currentUser }) => {
  const [availableDeputies, setAvailableDeputies] = useState<Employee[]>([]);
  const [selectedDeputy, setSelectedDeputy] = useState<string>('');
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');

  useEffect(() => {
    loadDeputies();
    loadSelectedDeputy();
  }, [currentUser]);

  const loadDeputies = () => {
    const employees = getEmployees();
    const currentEmployee = employees.find(emp => 
      emp.account?.username === currentUser || emp.name === currentUser
    );
    
    if (currentEmployee) {
      setCurrentUserDepartment(currentEmployee.departmentId);
      // Get employees from the same department who have accounts (excluding current user)
      const deputies = employees.filter(emp => 
        emp.departmentId === currentEmployee.departmentId &&
        emp.id !== currentEmployee.id &&
        emp.account && // Nur Mitarbeiter mit Account
        emp.account.username && // Username muss vorhanden sein
        emp.account.password   // Passwort muss vorhanden sein
      );
      setAvailableDeputies(deputies);
    }
  };

  const loadSelectedDeputy = () => {
    const savedDeputy = localStorage.getItem(`deputy_${currentUser}`);
    if (savedDeputy) {
      setSelectedDeputy(savedDeputy);
    }
  };

  const handleDeputyChange = (deputyId: string) => {
    setSelectedDeputy(deputyId);
    if (deputyId) {
      localStorage.setItem(`deputy_${currentUser}`, deputyId);
    } else {
      localStorage.removeItem(`deputy_${currentUser}`);
    }
  };

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
              <SelectItem value="">Keine Vertretung</SelectItem>
              {availableDeputies.map((deputy) => (
                <SelectItem key={deputy.id} value={deputy.id}>
                  {deputy.name} ({deputy.account?.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDeputy && (
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
