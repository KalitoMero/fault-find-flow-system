import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Settings, Key } from 'lucide-react';
import { setSettingsPassword } from '@/lib/settingsStorage';
import { toast } from "sonner";

interface SettingsPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPasswordDialog: React.FC<SettingsPasswordDialogProps> = ({ isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!newPassword.trim()) {
      toast.error('Bitte geben Sie ein neues Passwort ein');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('Passwort muss mindestens 4 Zeichen lang sein');
      return;
    }

    setSettingsPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Einstellungspasswort erfolgreich geändert');
    onClose();
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Einstellungspasswort ändern</span>
          </DialogTitle>
          <DialogDescription>
            Ändern Sie das Passwort für den Zugang zu den Einstellungen
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Neues Einstellungspasswort"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort bestätigen"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button onClick={handleChangePassword}>
              <Key className="h-4 w-4 mr-2" />
              Passwort ändern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPasswordDialog;