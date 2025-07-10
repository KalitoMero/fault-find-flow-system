
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Eye, EyeOff } from 'lucide-react';
import { Employee, saveEmployee, generatePassword } from '@/lib/settingsStorage';
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
  const [username, setUsername] = useState(employee.name.toLowerCase().replace(/\s+/g, '.'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAccount = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    setIsCreating(true);
    
    try {
      const updatedEmployee = {
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
      toast.success('Account erfolgreich erstellt');
    } catch (error) {
      toast.error('Fehler beim Erstellen des Accounts');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} in Zwischenablage kopiert`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account erstellen für {employee.name}</DialogTitle>
          <DialogDescription>
            Erstellen Sie Login-Daten für diesen Mitarbeiter
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
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(username, 'Benutzername')}
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
                placeholder="email@firma.de"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(email, 'E-Mail')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="password">Passwort</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(password, 'Passwort')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setPassword(generatePassword())}
            className="w-full"
          >
            Neues Passwort generieren
          </Button>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleCreateAccount} disabled={isCreating}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isCreating ? 'Erstelle...' : 'Account erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountCreationDialog;
