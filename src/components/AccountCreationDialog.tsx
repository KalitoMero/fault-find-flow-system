
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Employee, saveEmployee, generatePassword, getEmployees } from '@/lib/settingsStorage';
import { Copy } from 'lucide-react';
import { toast } from "sonner";

interface AccountCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onAccountCreated: () => void;
}

const AccountCreationDialog: React.FC<AccountCreationDialogProps> = ({
  isOpen,
  onClose,
  employee,
  onAccountCreated
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    toast.success('Passwort generiert');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} in Zwischenablage kopiert`);
  };

  const handleCreateAccount = () => {
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

    // Prüfen ob Benutzername bereits existiert
    const employees = getEmployees();
    const existingEmployee = employees.find(emp => 
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
    onAccountCreated();
    onClose();
    
    // Reset form
    setUsername('');
    setEmail('');
    setPassword('');
    
    toast.success('Account erfolgreich erstellt');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen Account für {employee.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Benutzername</Label>
            <div className="flex space-x-2">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Benutzername"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(username, 'Benutzername')}
                disabled={!username}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="email">E-Mail</Label>
            <div className="flex space-x-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(email, 'E-Mail')}
                disabled={!email}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="password">Passwort</Label>
            <div className="flex space-x-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(password, 'Passwort')}
                disabled={!password}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeneratePassword}
              className="mt-2"
            >
              Passwort generieren
            </Button>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Hinweis:</strong> Notieren Sie sich die Anmeldedaten, bevor Sie das Fenster schließen.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateAccount}>
              Account erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountCreationDialog;
