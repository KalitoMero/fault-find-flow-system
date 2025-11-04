import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { addUserRole } from '@/lib/supabaseStorage';
import { z } from 'zod';

const accountCreationSchema = z.object({
  username: z.string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
    .max(20, 'Benutzername darf maximal 20 Zeichen lang sein')
    .regex(/^[a-zA-Z0-9_]+$/, 'Benutzername darf nur Buchstaben, Zahlen und Unterstrich enthalten'),
  password: z.string()
    .min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(100, 'Name darf maximal 100 Zeichen lang sein')
});

interface ManagementAccountCreationFormProps {
  onAccountCreated: () => void;
}

const ManagementAccountCreationForm: React.FC<ManagementAccountCreationFormProps> = ({ onAccountCreated }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
    const validation = accountCreationSchema.safeParse({
      username: username.trim().toLowerCase(),
      password,
      name: name.trim()
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsCreating(true);
    
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const email = `${normalizedUsername}@internal.local`;

      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (existingProfile) {
        toast.error('Dieser Benutzername ist bereits vergeben');
        setIsCreating(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name.trim(),
            username: normalizedUsername
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Benutzer konnte nicht erstellt werden');
      }

      // Update profile with username
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          username: normalizedUsername,
          name: name.trim()
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      await addUserRole(authData.user.id, 'management');

      toast.success('Management-Account erfolgreich erstellt', {
        description: `Benutzername: ${normalizedUsername}`
      });
      onAccountCreated();
      
      setUsername('');
      setName('');
      setPassword('');
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Management-Accounts:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('Dieser Benutzername ist bereits vergeben');
      } else {
        toast.error('Fehler beim Erstellen des Accounts: ' + error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neuen Management-Account erstellen</CardTitle>
        <CardDescription>
          Erstellen Sie einen Account für die Geschäftsführung mit Zugriff auf alle Abteilungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
          />
        </div>

        <div>
          <Label htmlFor="username">Benutzername *</Label>
          <div className="flex space-x-2">
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="mmustermann"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(username, 'Benutzername')}
              disabled={!username}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Nur Buchstaben, Zahlen und Unterstrich erlaubt
          </p>
        </div>

        <div>
          <Label htmlFor="password">Passwort *</Label>
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

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Berechtigungen für Management-Accounts:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Zugriff auf alle Fehlermeldungen aller Abteilungen</li>
            <li>✓ Filterung nach Abteilungen möglich</li>
            <li>✓ Kostenübersicht (in Entwicklung)</li>
            <li>✗ Keine Berechtigung für Genehmigungen</li>
            <li>✗ Keine Berechtigung für Einstellungen</li>
          </ul>
        </div>

        <Button 
          onClick={handleCreateAccount} 
          disabled={isCreating || !username || !name || !password}
          className="w-full"
        >
          {isCreating ? 'Erstelle Management-Account...' : 'Management-Account erstellen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManagementAccountCreationForm;