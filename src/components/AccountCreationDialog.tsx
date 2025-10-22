import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { addUserRole } from '@/lib/supabaseStorage';

interface AccountCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  onAccountCreated: () => void;
}

const AccountCreationDialog: React.FC<AccountCreationDialogProps> = ({ 
  isOpen, 
  onClose, 
  profileId,
  profileName,
  onAccountCreated 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [role, setRole] = useState<'employee' | 'teamleader' | 'admin'>('employee');

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    toast.success('Passwort generiert');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} wurde in die Zwischenablage kopiert`);
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !password) {
      toast.error('E-Mail und Passwort sind erforderlich');
      return;
    }

    setIsCreating(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: profileName
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Benutzer konnte nicht erstellt werden');
      }

      await addUserRole(authData.user.id, role);

      toast.success('Account erfolgreich erstellt');
      onAccountCreated();
      onClose();
      
      setEmail('');
      setPassword('');
      setRole('employee');
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Accounts:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('Diese E-Mail-Adresse ist bereits registriert');
      } else {
        toast.error('Fehler beim Erstellen des Accounts: ' + error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Login-Daten erstellen - {profileName}</DialogTitle>
          <DialogDescription>
            Erstellen Sie Login-Daten für diesen Mitarbeiter
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@firma.de"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
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
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort eingeben"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                >
                  Generieren
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(password, 'Passwort')}
                  disabled={!password}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="role">Rolle</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="employee">Mitarbeiter</option>
                <option value="teamleader">Teamleiter</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleCreateAccount} disabled={isCreating}>
            {isCreating ? 'Erstelle...' : 'Account erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountCreationDialog;
