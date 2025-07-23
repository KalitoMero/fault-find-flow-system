import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield } from 'lucide-react';
import { getEmployees } from '@/lib/settingsStorage';
import { toast } from "sonner";

interface AdminAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminAuthDialog: React.FC<AdminAuthDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      toast.error('Bitte geben Sie Benutzername und Passwort ein');
      return;
    }

    // Standard-Admin prüfen
    if (username === 'admin' && password === 'admin') {
      onSuccess();
      onClose();
      setUsername('');
      setPassword('');
      return;
    }

    // Erstellte Admin-Accounts prüfen
    const employees = getEmployees();
    const adminAccount = employees.find(emp => 
      emp.isAdmin && 
      emp.account && 
      emp.account.username === username && 
      emp.account.password === password
    );

    if (adminAccount) {
      onSuccess();
      onClose();
      setUsername('');
      setPassword('');
    } else {
      toast.error('Ungültige Administrator-Anmeldedaten');
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Administrator-Anmeldung</span>
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Administrator-Anmeldedaten ein, um fortzufahren.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="adminUsername">Benutzername</Label>
            <Input
              id="adminUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin-Benutzername"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          
          <div>
            <Label htmlFor="adminPassword">Passwort</Label>
            <Input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin-Passwort"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit}>
              <Shield className="h-4 w-4 mr-2" />
              Anmelden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAuthDialog;