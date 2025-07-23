import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Shield, Key, UserCog } from 'lucide-react';
import { 
  Employee, 
  getEmployees, 
  saveEmployee,
  deleteEmployee,
  getDepartments,
  generateId 
} from '@/lib/settingsStorage';
import { getSettingsPassword, setSettingsPassword } from '@/lib/settingsStorage';
import { toast } from "sonner";

const AdminManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [newSettingsPassword, setNewSettingsPassword] = useState('');
  const [confirmSettingsPassword, setConfirmSettingsPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setEmployees(getEmployees());
    setDepartments(getDepartments());
  };

  const handleCreateAdmin = () => {
    if (!newAdminUsername.trim()) {
      toast.error('Bitte geben Sie einen Benutzernamen ein');
      return;
    }
    if (!newAdminPassword.trim()) {
      toast.error('Bitte geben Sie ein Passwort ein');
      return;
    }
    // Admins brauchen keine Abteilung - setze default Wert
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0].id);
    }

    // Prüfen ob Username bereits existiert
    const existingEmployee = employees.find(emp => emp.account?.username === newAdminUsername.trim());
    if (existingEmployee) {
      toast.error('Ein Benutzer mit diesem Benutzernamen existiert bereits');
      return;
    }

    const newAdmin: Employee = {
      id: generateId(),
      name: newAdminName.trim() || newAdminUsername.trim(), // Fallback zum Username falls kein Name
      departmentId: selectedDepartment || 'admin', // Admins brauchen keine echte Abteilung
      isTeamLeader: false,
      isAdmin: true,
      account: {
        username: newAdminUsername.trim(),
        email: `${newAdminUsername.trim()}@admin.local`,
        password: newAdminPassword.trim()
      }
    };

    saveEmployee(newAdmin);
    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminPassword('');
    setSelectedDepartment('');
    loadData();
    toast.success('Admin-Account erfolgreich erstellt');
  };

  const handleToggleAdmin = (employeeId: string, isAdmin: boolean) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      const updatedEmployee = { ...employee, isAdmin };
      saveEmployee(updatedEmployee);
      loadData();
      toast.success(`Admin-Status für ${employee.name} ${isAdmin ? 'aktiviert' : 'deaktiviert'}`);
    }
  };

  const handleDeleteAdmin = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && window.confirm(`Möchten Sie den Admin-Account von ${employee.name} wirklich löschen?`)) {
      deleteEmployee(employeeId);
      loadData();
      toast.success('Admin-Account gelöscht');
    }
  };

  const handleChangeSettingsPassword = () => {
    if (!newSettingsPassword.trim()) {
      toast.error('Bitte geben Sie ein neues Passwort ein');
      return;
    }
    if (newSettingsPassword !== confirmSettingsPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (newSettingsPassword.length < 4) {
      toast.error('Passwort muss mindestens 4 Zeichen lang sein');
      return;
    }

    setSettingsPassword(newSettingsPassword);
    setNewSettingsPassword('');
    setConfirmSettingsPassword('');
    toast.success('Einstellungspasswort erfolgreich geändert');
  };

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unbekannte Abteilung';
  };

  const adminEmployees = employees.filter(emp => emp.isAdmin && emp.account);

  return (
    <div className="space-y-6">
      {/* Einstellungspasswort ändern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Einstellungspasswort ändern</span>
          </CardTitle>
          <CardDescription>
            Ändern Sie das Passwort für den Zugang zu den Einstellungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newSettingsPassword">Neues Passwort</Label>
              <Input
                id="newSettingsPassword"
                type="password"
                value={newSettingsPassword}
                onChange={(e) => setNewSettingsPassword(e.target.value)}
                placeholder="Neues Einstellungspasswort"
              />
            </div>
            <div>
              <Label htmlFor="confirmSettingsPassword">Passwort bestätigen</Label>
              <Input
                id="confirmSettingsPassword"
                type="password"
                value={confirmSettingsPassword}
                onChange={(e) => setConfirmSettingsPassword(e.target.value)}
                placeholder="Passwort bestätigen"
              />
            </div>
          </div>
          <Button onClick={handleChangeSettingsPassword}>
            <Key className="h-4 w-4 mr-2" />
            Passwort ändern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCog className="h-5 w-5" />
            <span>Neuen Admin-Account erstellen</span>
          </CardTitle>
          <CardDescription>
            Erstellen Sie einen neuen Administrator-Account (Name und Abteilung optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="adminName">Name (optional)</Label>
              <Input
                id="adminName"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Vor- und Nachname (optional)"
              />
            </div>
            <div>
              <Label htmlFor="adminUsername">Benutzername</Label>
              <Input
                id="adminUsername"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="Benutzername"
              />
            </div>
            <div>
              <Label htmlFor="adminPassword">Passwort</Label>
              <Input
                id="adminPassword"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Passwort"
              />
            </div>
            <div>
              <Label htmlFor="adminDepartment">Abteilung (optional)</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Abteilung auswählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreateAdmin}>
            <Plus className="h-4 w-4 mr-2" />
            Admin erstellen
          </Button>
        </CardContent>
      </Card>

      {/* Vorhandene Admin-Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Vorhandene Admin-Accounts</CardTitle>
          <CardDescription>
            Verwalten Sie bestehende Administrator-Accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adminEmployees.length === 0 ? (
            <div className="text-center py-8">
              <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Admin-Accounts vorhanden
              </h3>
              <p className="text-gray-500">
                Erstellen Sie den ersten Administrator-Account.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{employee.name}</span>
                      <Badge variant="default">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                      <span className="text-sm text-gray-500">@{employee.account?.username}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getDepartmentName(employee.departmentId)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`admin-${employee.id}`}
                        checked={employee.isAdmin || false}
                        onCheckedChange={(checked) => 
                          handleToggleAdmin(employee.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`admin-${employee.id}`} className="text-sm">
                        Admin
                      </Label>
                    </div>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAdmin(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;