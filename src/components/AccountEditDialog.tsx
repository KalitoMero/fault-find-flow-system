
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Employee, saveEmployee, getEmployees } from '@/lib/settingsStorage';
import { toast } from "sonner";

interface AccountEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onAccountUpdated: () => void;
}

const AccountEditDialog: React.FC<AccountEditDialogProps> = ({
  isOpen,
  onClose,
  employee,
  onAccountUpdated
}) => {
  const [username, setUsername] = useState(employee.account?.username || '');
  const [email, setEmail] = useState(employee.account?.email || '');
  const [password, setPassword] = useState(employee.account?.password || '');

  const handleSave = () => {
    if (!username.trim()) {
      toast.error('Benutzername ist erforderlich');
      return;
    }

    if (!email.trim()) {
      toast.error('E-Mail ist erforderlich');
      return;
    }

    if (!password.trim()) {
      toast.error('Passwort ist erforderlich');
      return;
    }

    // Prüfen ob Benutzername bereits existiert (außer beim aktuellen Mitarbeiter)
    const employees = getEmployees();
    const existingEmployee = employees.find(emp => 
      emp.id !== employee.id && 
      emp.account?.username.toLowerCase() === username.toLowerCase()
    );

    if (existingEmployee) {
      toast.error('Dieser Benutzername ist bereits vergeben');
      return;
    }

    const updatedEmployee: Employee = {
      ...employee,
      account: {
        username: username.trim(),
        email: email.trim(),
        password: password.trim()
      }
    };

    saveEmployee(updatedEmployee);
    onAccountUpdated();
    onClose();
    toast.success('Account erfolgreich aktualisiert');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account bearbeiten</DialogTitle>
          <DialogDescription>
            Anmeldedaten für {employee.name} bearbeiten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-username">Benutzername</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername"
            />
          </div>

          <div>
            <Label htmlFor="edit-email">E-Mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <Label htmlFor="edit-password">Passwort</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountEditDialog;
