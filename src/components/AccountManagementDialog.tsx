import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Save } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface AccountManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onAccountUpdated: () => void;
}

const AccountManagementDialog: React.FC<AccountManagementDialogProps> = ({ 
  isOpen, 
  onClose, 
  userId,
  userName,
  onAccountUpdated 
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateAccount = async () => {
    if (!newPassword) {
      toast.error('Bitte geben Sie ein neues Passwort ein');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setIsUpdating(true);
    
    try {
      // Passwort über Supabase Auth aktualisieren
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Passwort erfolgreich aktualisiert');
      onAccountUpdated();
      onClose();
      
      // Felder zurücksetzen
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren des Passworts:', error);
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account verwalten - {userName}</DialogTitle>
          <DialogDescription>
            Passwort ändern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Lock className="h-4 w-4" />
                <span>Neues Passwort</span>
              </CardTitle>
              <CardDescription>
                Geben Sie ein neues Passwort ein (mindestens 6 Zeichen)
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
