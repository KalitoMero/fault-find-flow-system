import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Save, User } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { updateEmployee } from '@/lib/employeeManagement';
import { getDepartments, type Department } from '@/lib/settingsStorage';

interface AccountManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    name: string;
    personalNumber?: string;
    departmentId: string;
    isTeamLeader?: boolean;
    isAdmin?: boolean;
  };
  onAccountUpdated: () => void;
}

const AccountManagementDialog: React.FC<AccountManagementDialogProps> = ({ 
  isOpen, 
  onClose, 
  employee,
  onAccountUpdated 
}) => {
  const [name, setName] = useState(employee.name);
  const [personalNumber, setPersonalNumber] = useState(employee.personalNumber || '');
  const [departmentId, setDepartmentId] = useState(employee.departmentId);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      setName(employee.name);
      setPersonalNumber(employee.personalNumber || '');
      setDepartmentId(employee.departmentId);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, employee]);

  const loadDepartments = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Fehler beim Laden der Abteilungen');
    }
  };

  const handleUpdateAccount = async () => {
    if (!name.trim()) {
      toast.error('Name darf nicht leer sein');
      return;
    }

    // Password validation only if password is being changed
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast.error('Passwörter stimmen nicht überein');
        return;
      }

      if (newPassword.length < 6) {
        toast.error('Passwort muss mindestens 6 Zeichen lang sein');
        return;
      }
    }

    setIsUpdating(true);
    
    try {
      // Update employee data via edge function
      await updateEmployee({
        id: employee.id,
        name: name.trim(),
        departmentId: departmentId,
        personalNumber: personalNumber.trim() || undefined,
        isTeamLeader: employee.isTeamLeader,
        isAdmin: employee.isAdmin
      });

      // Update password if provided
      if (newPassword) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Nicht authentifiziert');
        }

        // Use admin client via edge function for password update
        const { error: passwordError } = await supabase.functions.invoke('manage-employees', {
          body: {
            action: 'update-password',
            data: {
              userId: employee.id,
              password: newPassword
            }
          }
        });

        if (passwordError) throw passwordError;
      }

      toast.success('Mitarbeiter erfolgreich aktualisiert');
      onAccountUpdated();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten - {employee.name}</DialogTitle>
          <DialogDescription>
            Name, Personalnummer, Abteilung und Passwort ändern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <User className="h-4 w-4" />
                <span>Persönliche Daten</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
                />
              </div>

              <div>
                <Label htmlFor="personalNumber">Personalnummer (optional)</Label>
                <Input
                  id="personalNumber"
                  value={personalNumber}
                  onChange={(e) => setPersonalNumber(e.target.value)}
                  placeholder="z.B. 12345"
                />
              </div>

              <div>
                <Label htmlFor="department">Abteilung</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Abteilung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Lock className="h-4 w-4" />
                <span>Passwort ändern (optional)</span>
              </CardTitle>
              <CardDescription>
                Lassen Sie diese Felder leer, wenn Sie das Passwort nicht ändern möchten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 4 Zeichen"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleUpdateAccount} disabled={isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Speichere...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountManagementDialog;
