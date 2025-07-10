
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from 'lucide-react';
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
  }, [currentUser]);

  const loadDeputies = () => {
    const employees = getEmployees();
    const currentEmployee = employees.find(emp => 
      emp.account?.username === currentUser || emp.name === currentUser
    );
    
    if (currentEmployee) {
      setCurrentUserDepartment(currentEmployee.departmentId);
      // Get team leaders from the same department, excluding current user
      const deputies = getTeamLeadersByDepartment(currentEmployee.departmentId)
        .filter(emp => emp.id !== currentEmployee.id);
      setAvailableDeputies(deputies);
    }
  };

  const handleDeputyChange = (deputyId: string) => {
    setSelectedDeputy(deputyId);
    // Here you could save the deputy selection to localStorage or send to backend
    localStorage.setItem(`deputy_${currentUser}`, deputyId);
  };

  if (availableDeputies.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="h-5 w-5" />
          <span>Vertretung auswählen</span>
        </CardTitle>
        <CardDescription>
          Wählen Sie einen Teamleiter aus Ihrer Abteilung als Vertretung aus
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
              {availableDeputies.map((deputy) => (
                <SelectItem key={deputy.id} value={deputy.id}>
                  {deputy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeputySelection;
