import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Building, Users, UserPlus, Shield, Settings, MapPin, Download, Upload, Image, FileSpreadsheet } from 'lucide-react';
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
  generateId,
  getLogo,
  setLogo,
  removeLogo
} from '@/lib/settingsStorage';
import AccountCreationDialog from './AccountCreationDialog';
import AccountManagementDialog from './AccountManagementDialog';
import ManagementAccountCreationForm from './ManagementAccountCreationForm';
import AdminManagement from './AdminManagement';
import AdminAuthDialog from './AdminAuthDialog';
import ExcelUploadSettings from './ExcelUploadSettings';
import ExportSection from './ExportSection';
import N8nWebhookSettings from './N8nWebhookSettings';
import { getErrorReports } from '@/lib/storage';
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
  const [newDepartmentCode, setNewDepartmentCode] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [selectedDepartmentForEmployee, setSelectedDepartmentForEmployee] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('all');
  const [accountCreationEmployee, setAccountCreationEmployee] = useState<Employee | null>(null);
  const [accountManagementEmployee, setAccountManagementEmployee] = useState<Employee | null>(null);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [n8nWebhookEnabled, setN8nWebhookEnabled] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [errorReports, setErrorReports] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset admin authentication when modal is closed
      setShowAdminPanel(false);
      setShowAdminAuth(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDepartmentFilter === 'all') {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(employees.filter(emp => emp.departmentId === selectedDepartmentFilter));
    }
  }, [employees, selectedDepartmentFilter]);

  const loadData = async () => {
    setDepartments(await getDepartments());
    setEmployees(await getEmployees());
    setMachines(await getMachines());
    setCurrentLogo(await getLogo());
    
    // Load error reports for export
    try {
      const reports = await getErrorReports();
      setErrorReports(reports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setErrorReports([]);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wählen Sie eine Bilddatei aus');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Die Datei ist zu groß. Bitte wählen Sie eine Datei unter 2MB aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogo(dataUrl);
      setCurrentLogo(dataUrl);
      // Trigger custom event to update logo display
      window.dispatchEvent(new Event('logoUpdated'));
      toast.success('Logo erfolgreich hochgeladen');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    removeLogo();
    setCurrentLogo(null);
    // Trigger custom event to update logo display
    window.dispatchEvent(new Event('logoUpdated'));
    toast.success('Logo entfernt');
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentCode.trim()) {
      toast.error('Bitte geben Sie einen Abteilungscode ein');
      return;
    }

    if (!newDepartmentName.trim()) {
      toast.error('Bitte geben Sie einen Abteilungsnamen ein');
      return;
    }

    const newDepartment: Department = {
      id: editingDepartment?.id || generateId(),
      name: newDepartmentName.trim(),
      code: newDepartmentCode.trim().toUpperCase()
    };

    try {
      await saveDepartment(newDepartment);
      setNewDepartmentName('');
      setNewDepartmentCode('');
      setEditingDepartment(null);
      loadData();
      toast.success(editingDepartment ? 'Abteilung erfolgreich aktualisiert' : 'Abteilung erfolgreich erstellt');
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Fehler beim Speichern der Abteilung');
    }
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setNewDepartmentCode(department.code || '');
    setNewDepartmentName(department.name);
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setNewDepartmentCode('');
    setNewDepartmentName('');
  };

  const handleDeleteDepartment = (departmentId: string) => {
    deleteDepartment(departmentId);
    loadData();
    toast.success('Abteilung gelöscht');
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast.error('Bitte geben Sie einen Mitarbeiternamen ein');
      return;
    }

    if (!selectedDepartmentForEmployee) {
      toast.error('Bitte wählen Sie eine Abteilung aus');
      return;
    }

    // Prompt for account creation with better validation
    const email = prompt('E-Mail-Adresse für den neuen Mitarbeiter:\n(z.B. mitarbeiter@firma.de)');
    if (!email || !email.trim()) {
      toast.error('E-Mail-Adresse ist erforderlich');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    const password = prompt('Passwort für den neuen Mitarbeiter:\n(mindestens 6 Zeichen)');
    if (!password || password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    try {
      await (await import('@/lib/employeeManagement')).createEmployee({
        name: newEmployeeName.trim(),
        departmentId: selectedDepartmentForEmployee,
        email: email.trim(),
        password: password,
        isTeamLeader: false,
        isAdmin: false
      });

      setNewEmployeeName('');
      setSelectedDepartmentForEmployee('');
      loadData();
      toast.success('Mitarbeiter erfolgreich erstellt');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      // Show user-friendly error message
      const errorMessage = error.message || 'Unbekannter Fehler';
      toast.error(errorMessage);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId);
      loadData();
      toast.success('Mitarbeiter gelöscht');
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error('Fehler beim Löschen des Mitarbeiters: ' + error.message);
    }
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

  const handleTeamLeaderChange = async (employeeId: string, isTeamLeader: boolean) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      try {
        const updatedEmployee = { ...employee, isTeamLeader };
        await saveEmployee(updatedEmployee);
        loadData();
        toast.success(`Teamleiter-Status für ${employee.name} ${isTeamLeader ? 'aktiviert' : 'deaktiviert'}`);
      } catch (error: any) {
        console.error('Error updating employee:', error);
        toast.error('Fehler beim Aktualisieren: ' + error.message);
      }
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

  const handleAdminTabClick = () => {
    setShowAdminAuth(true);
  };

  const handleAdminAuthSuccess = () => {
    setShowAdminPanel(true);
  };

  const handleN8nSettingsChange = (enabled: boolean, url: string) => {
    setN8nWebhookEnabled(enabled);
    setN8nWebhookUrl(url);
    console.log('🔧 SettingsModal: N8N settings changed:', { enabled, url });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Verwalten Sie Abteilungen, Mitarbeiter und Feststellorte
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="departments" className="space-y-4" onValueChange={(value) => value === 'admin' && handleAdminTabClick()}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="departments" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Abteilungen</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Mitarbeiter</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span>Unternehmen</span>
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel-Import</span>
            </TabsTrigger>
            <TabsTrigger value="n8n" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>N8N Integration</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Management</span>
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Administration</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editingDepartment ? 'Abteilung bearbeiten' : 'Neue Abteilung erstellen'}</CardTitle>
                <CardDescription>
                  {editingDepartment ? 'Ändern Sie Code und Name der Abteilung' : 'Fügen Sie eine neue Abteilung hinzu'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="departmentCode">Abteilungscode (aus Excel)</Label>
                    <Input
                      id="departmentCode"
                      value={newDepartmentCode}
                      onChange={(e) => setNewDepartmentCode(e.target.value.toUpperCase())}
                      placeholder="z.B. FRÄ"
                      maxLength={10}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Der kurze Code aus der Excel-Datei
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="departmentName">Anzeigename</Label>
                    <Input
                      id="departmentName"
                      value={newDepartmentName}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                      placeholder="z.B. Fräsen"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Der Name, der in der Anwendung angezeigt wird
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddDepartment}>
                    <Plus className="h-4 w-4 mr-2" />
                    {editingDepartment ? 'Aktualisieren' : 'Hinzufügen'}
                  </Button>
                  {editingDepartment && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Abbrechen
                    </Button>
                  )}
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {department.code && (
                              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {department.code}
                              </span>
                            )}
                            <span className="font-medium">{department.name}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDepartment(department)}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDepartment(department.id)}
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


          <TabsContent value="export" className="space-y-4">
            <ExportSection reports={errorReports} />
          </TabsContent>

          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Firmenlogo</CardTitle>
                <CardDescription>
                  Laden Sie das Logo Ihres Unternehmens hoch. Es wird in der unteren rechten Ecke jeder Seite angezeigt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentLogo ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Aktuelles Logo:</span>
                        <img 
                          src={currentLogo} 
                          alt="Aktuelles Logo" 
                          className="w-10 h-10 object-contain border rounded"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleLogoRemove}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Logo entfernen
                      </Button>
                    </div>
                    <div>
                      <Label htmlFor="logo-upload-replace">Logo ersetzen</Label>
                      <Input
                        id="logo-upload-replace"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unterstützte Formate: JPG, PNG, GIF. Maximale Größe: 2MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Kein Logo hochgeladen
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Laden Sie das Logo Ihres Unternehmens hoch
                      </p>
                      <div className="max-w-xs mx-auto">
                        <Label htmlFor="logo-upload" className="sr-only">Logo hochladen</Label>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Unterstützte Formate: JPG, PNG, GIF. Maximale Größe: 2MB
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excel">
            <ExcelUploadSettings />
          </TabsContent>

          <TabsContent value="n8n">
            <N8nWebhookSettings onSettingsChange={handleN8nSettingsChange} />
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <ManagementAccountCreationForm onAccountCreated={loadData} />
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            {showAdminPanel ? (
              <AdminManagement />
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Administrator-Zugang erforderlich
                </h3>
                <p className="text-gray-500">
                  Klicken Sie auf den Administration-Tab, um sich zu authentifizieren.
                </p>
              </div>
            )}
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
          profileId={accountCreationEmployee.id}
          profileName={accountCreationEmployee.name}
          onAccountCreated={handleAccountCreated}
        />
      )}

        {accountManagementEmployee && (
          <AccountManagementDialog
            isOpen={!!accountManagementEmployee}
            onClose={() => setAccountManagementEmployee(null)}
            userId={accountManagementEmployee.id}
            userName={accountManagementEmployee.name}
            onAccountUpdated={handleAccountUpdated}
          />
        )}

        <AdminAuthDialog
          isOpen={showAdminAuth}
          onClose={() => setShowAdminAuth(false)}
          onSuccess={handleAdminAuthSuccess}
        />
    </Dialog>
  );
};

export default SettingsModal;
