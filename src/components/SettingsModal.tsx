import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Building, Users, UserPlus, Shield, Settings, MapPin } from 'lucide-react';
import { 
  Department, 
  Employee, 
  Machine,
  getDepartments, 
  getEmployees, 
  getMachines,
  saveDepartment, 
  saveEmployee, 
  saveMachine,
  deleteDepartment, 
  deleteEmployee, 
  deleteMachine,
  getEmployeesByDepartment,
  generateId 
} from '@/lib/settingsStorage';
import AccountCreationDialog from './AccountCreationDialog';
import AccountManagementDialog from './AccountManagementDialog';
import AdminManagement from './AdminManagement';
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [selectedDepartmentForEmployee, setSelectedDepartmentForEmployee] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('all');
  const [accountCreationEmployee, setAccountCreationEmployee] = useState<Employee | null>(null);
  const [accountManagementEmployee, setAccountManagementEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDepartmentFilter === 'all') {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(employees.filter(emp => emp.departmentId === selectedDepartmentFilter));
    }
  }, [employees, selectedDepartmentFilter]);

  const loadData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
    setMachines(getMachines());
  };

  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toast.error('Bitte geben Sie einen Abteilungsnamen ein');
      return;
    }

    const newDepartment: Department = {
      id: generateId(),
      name: newDepartmentName.trim()
    };

    saveDepartment(newDepartment);
    setNewDepartmentName('');
    loadData();
    toast.success('Abteilung erfolgreich erstellt');
  };

  const handleDeleteDepartment = (departmentId: string) => {
    deleteDepartment(departmentId);
    loadData();
    toast.success('Abteilung gelöscht');
  };

  const handleAddEmployee = () => {
    if (!newEmployeeName.trim()) {
      toast.error('Bitte geben Sie einen Mitarbeiternamen ein');
      return;
    }

    if (!selectedDepartmentForEmployee) {
      toast.error('Bitte wählen Sie eine Abteilung aus');
      return;
    }

    const newEmployee: Employee = {
      id: generateId(),
      name: newEmployeeName.trim(),
      departmentId: selectedDepartmentForEmployee,
      isTeamLeader: false
    };

    saveEmployee(newEmployee);
    setNewEmployeeName('');
    setSelectedDepartmentForEmployee('');
    loadData();
    toast.success('Mitarbeiter erfolgreich erstellt');
  };

  const handleDeleteEmployee = (employeeId: string) => {
    deleteEmployee(employeeId);
    loadData();
    toast.success('Mitarbeiter gelöscht');
  };

  const handleAddMachine = () => {
    if (!newMachineName.trim()) {
      toast.error('Bitte geben Sie einen Feststellort ein');
      return;
    }

    const newMachine: Machine = {
      id: generateId(),
      name: newMachineName.trim()
    };

    saveMachine(newMachine);
    setNewMachineName('');
    loadData();
    toast.success('Feststellort erfolgreich erstellt');
  };

  const handleDeleteMachine = (machineId: string) => {
    deleteMachine(machineId);
    loadData();
    toast.success('Feststellort gelöscht');
  };

  const handleTeamLeaderChange = (employeeId: string, isTeamLeader: boolean) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      const updatedEmployee = { ...employee, isTeamLeader };
      saveEmployee(updatedEmployee);
      loadData();
      toast.success(`Teamleiter-Status für ${employee.name} ${isTeamLeader ? 'aktiviert' : 'deaktiviert'}`);
    }
  };

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unbekannte Abteilung';
  };

  const handleAccountCreation = (employee: Employee) => {
    setAccountCreationEmployee(employee);
  };

  const handleAccountManagement = (employee: Employee) => {
    setAccountManagementEmployee(employee);
  };

  const handleAccountCreated = () => {
    loadData();
  };

  const handleAccountUpdated = () => {
    loadData();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Verwalten Sie Abteilungen, Mitarbeiter und Feststellorte
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="departments" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Abteilungen</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Mitarbeiter</span>
            </TabsTrigger>
            <TabsTrigger value="machines" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Feststellorte</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Administration</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Neue Abteilung erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie eine neue Abteilung hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="departmentName">Abteilungsname</Label>
                    <Input
                      id="departmentName"
                      value={newDepartmentName}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                      placeholder="z.B. Produktion"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddDepartment}>
                      <Plus className="h-4 w-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vorhandene Abteilungen</CardTitle>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Abteilungen vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {departments.map((department) => (
                      <div key={department.id} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{department.name}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDepartment(department.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Neuen Mitarbeiter erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie einen neuen Mitarbeiter zu einer Abteilung hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employeeName">Mitarbeitername</Label>
                    <Input
                      id="employeeName"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="Vor- und Nachname"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeDepartment">Abteilung</Label>
                    <Select value={selectedDepartmentForEmployee} onValueChange={setSelectedDepartmentForEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Abteilung auswählen" />
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
                  <div className="flex items-end">
                    <Button onClick={handleAddEmployee} disabled={departments.length === 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
                {departments.length === 0 && (
                  <p className="text-sm text-orange-600">
                    Erstellen Sie zuerst eine Abteilung, bevor Sie Mitarbeiter hinzufügen können.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vorhandene Mitarbeiter</CardTitle>
                <CardDescription>
                  Verwalten Sie Mitarbeiter, Teamleiter-Rollen und Accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="departmentFilter">Nach Abteilung filtern</Label>
                  <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Abteilung auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Abteilungen</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredEmployees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Mitarbeiter vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {filteredEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{employee.name}</span>
                            {employee.isTeamLeader && (
                              <Shield className="h-4 w-4 text-blue-600" />
                            )}
                            {employee.account && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Account vorhanden
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{getDepartmentName(employee.departmentId)}</p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`teamleader-${employee.id}`}
                              checked={employee.isTeamLeader || false}
                              onCheckedChange={(checked) => 
                                handleTeamLeaderChange(employee.id, checked as boolean)
                              }
                            />
                            <Label htmlFor={`teamleader-${employee.id}`} className="text-sm">
                              Teamleiter
                            </Label>
                          </div>
                          
                          {!employee.account ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAccountCreation(employee)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Account
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAccountManagement(employee)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Bearbeiten
                            </Button>
                          )}
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.id)}
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
          </TabsContent>

          <TabsContent value="machines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Neuen Feststellort erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie einen neuen Feststellort hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="machineName">Feststellort</Label>
                    <Input
                      id="machineName"
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                      placeholder="z.B. Halle 1 - Arbeitsplatz 3"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMachine()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddMachine}>
                      <Plus className="h-4 w-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vorhandene Feststellorte</CardTitle>
              </CardHeader>
              <CardContent>
                {machines.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Feststellorte vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {machines.map((machine) => (
                      <div key={machine.id} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{machine.name}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMachine(machine.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <AdminManagement />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Schließen</Button>
        </div>
      </DialogContent>

      {accountCreationEmployee && (
        <AccountCreationDialog
          isOpen={!!accountCreationEmployee}
          onClose={() => setAccountCreationEmployee(null)}
          employee={accountCreationEmployee}
          onAccountCreated={handleAccountCreated}
        />
      )}

      {accountManagementEmployee && (
        <AccountManagementDialog
          isOpen={!!accountManagementEmployee}
          onClose={() => setAccountManagementEmployee(null)}
          employee={accountManagementEmployee}
          onAccountUpdated={handleAccountUpdated}
        />
      )}
    </Dialog>
  );
};

export default SettingsModal;
