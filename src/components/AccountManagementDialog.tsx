
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Lock, Save } from 'lucide-react';
import { Employee, saveEmployee } from '@/lib/settingsStorage';
import { toast } from "sonner";

interface AccountManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onAccountUpdated: () => void;
}

const AccountManagementDialog: React.FC<AccountManagementDialogProps> = ({ 
  isOpen, 
  onClose, 
  employee, 
  onAccountUpdated 
}) => {
  const [username, setUsername] = useState(employee.account?.username || '');
  const [email, setEmail] = useState(employee.account?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateAccount = async () => {
    if (!username.trim() || !email.trim()) {
      toast.error('Benutzername und E-Mail sind erforderlich');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword && currentPassword !== employee.account?.password) {
      toast.error('Aktuelles Passwort ist falsch');
      return;
    }

    setIsUpdating(true);
    
    try {
      const updatedEmployee = {
        ...employee,
        account: {
          ...employee.account!,
          username: username.trim(),
          email: email.trim(),
          password: newPassword || employee.account!.password
        }
      };

      saveEmployee(updatedEmployee);
      onAccountUpdated();
      onClose();
      toast.success('Account erfolgreich aktualisiert');
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Accounts');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account verwalten - {employee.name}</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie Ihre Anmeldedaten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <User className="h-4 w-4" />
                <span>Grunddaten</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Benutzername"
                />
              </div>

              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@firma.de"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Lock className="h-4 w-4" />
                <span>Passwort ändern</span>
              </CardTitle>
              <CardDescription>
                Lassen Sie die Felder leer, um das Passwort unverändert zu lassen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Aktuelles Passwort eingeben"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Neues Passwort eingeben"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Neues Passwort wiederholen"
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
