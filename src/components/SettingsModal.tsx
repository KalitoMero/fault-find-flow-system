
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Building, Users } from 'lucide-react';
import { 
  Department, 
  Employee, 
  getDepartments, 
  getEmployees, 
  saveDepartment, 
  saveEmployee, 
  deleteDepartment, 
  deleteEmployee, 
  getEmployeesByDepartment,
  generateId 
} from '@/lib/settingsStorage';
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [selectedDepartmentForEmployee, setSelectedDepartmentForEmployee] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
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
      departmentId: selectedDepartmentForEmployee
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

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unbekannte Abteilung';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Verwalten Sie Abteilungen und Mitarbeiter
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="departments" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Abteilungen</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Mitarbeiter</span>
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
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Mitarbeiter vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{employee.name}</span>
                          <p className="text-sm text-gray-500">{getDepartmentName(employee.departmentId)}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee.id)}
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
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
