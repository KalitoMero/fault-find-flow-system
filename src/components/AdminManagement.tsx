import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { getProfiles, addUserRole, removeUserRole } from '@/lib/storage';
import { requireAdminOrThrow } from '@/lib/authz';
import { accountCreationSchema } from '@/lib/validation';

interface Profile {
  id: string;
  name: string;
  personal_number?: string;
  department_id?: string;
  roles: string[];
  isAdmin: boolean;
  isTeamLeader: boolean;
}

const AdminManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Fehler beim Laden der Profile:', error);
      toast.error('Fehler beim Laden der Profile');
    }
  };

  const handleCreateAdmin = async () => {
    try {
      // Admin authorization check
      await requireAdminOrThrow();

      // Validate input with zod
      const validation = accountCreationSchema.safeParse({
        email: newAdminEmail,
        password: newAdminPassword,
        name: newAdminName
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        return;
      }
    } catch (error: any) {
      if (error.message === 'forbidden') {
        toast.error('Kein Zugriff. Nur Admins können diese Aktion ausführen.');
        return;
      }
      toast.error('Fehler bei der Autorisierungsprüfung');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: newAdminName.trim()
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Benutzer konnte nicht erstellt werden');
      }

      await addUserRole(authData.user.id, 'admin');

      toast.success('Admin erfolgreich erstellt');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      loadProfiles();
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Admins:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('Diese E-Mail-Adresse ist bereits registriert');
      } else {
        toast.error('Fehler beim Erstellen des Admins: ' + error.message);
      }
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      // Admin authorization check
      await requireAdminOrThrow();

      if (isCurrentlyAdmin) {
        await removeUserRole(userId, 'admin');
        toast.success('Admin-Rechte entfernt');
      } else {
        await addUserRole(userId, 'admin');
        toast.success('Admin-Rechte hinzugefügt');
      }
      loadProfiles();
    } catch (error: any) {
      if (error.message === 'forbidden') {
        toast.error('Kein Zugriff. Nur Admins können diese Aktion ausführen.');
        return;
      }
      console.error('Fehler beim Ändern der Admin-Rechte:', error);
      toast.error('Fehler beim Ändern der Admin-Rechte');
    }
  };

  const handleDeleteAdmin = async (userId: string, userName: string) => {
    if (!confirm(`Möchten Sie den Account von "${userName}" wirklich löschen?`)) {
      return;
    }

    try {
      // Admin authorization check
      await requireAdminOrThrow();

      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast.success('Account erfolgreich gelöscht');
      loadProfiles();
    } catch (error: any) {
      if (error.message === 'forbidden') {
        toast.error('Kein Zugriff. Nur Admins können diese Aktion ausführen.');
        return;
      }
      console.error('Fehler beim Löschen des Accounts:', error);
      toast.error('Fehler beim Löschen: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Neuen Administrator anlegen</span>
          </CardTitle>
          <CardDescription>
            Erstellen Sie einen neuen Administrator-Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="adminName">Name</Label>
              <Input
                id="adminName"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <Label htmlFor="adminEmail">E-Mail</Label>
              <Input
                id="adminEmail"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@firma.de"
              />
            </div>
            <div>
              <Label htmlFor="adminPassword">Passwort</Label>
              <Input
                id="adminPassword"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Passwort"
              />
            </div>
          </div>
          <Button onClick={handleCreateAdmin} className="mt-4">
            <UserPlus className="h-4 w-4 mr-2" />
            Admin erstellen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestehende Accounts</CardTitle>
          <CardDescription>
            Verwalten Sie bestehende Benutzer-Accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Personalnummer</TableHead>
                <TableHead>Rollen</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.name}</TableCell>
                  <TableCell>{profile.personal_number || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {profile.isAdmin && (
                        <Badge variant="destructive">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {profile.isTeamLeader && (
                        <Badge variant="secondary">Teamleiter</Badge>
                      )}
                      {!profile.isAdmin && !profile.isTeamLeader && (
                        <Badge variant="outline">Mitarbeiter</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={profile.isAdmin ? "outline" : "default"}
                        onClick={() => handleToggleAdmin(profile.id, profile.isAdmin)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {profile.isAdmin ? 'Admin entziehen' : 'Zu Admin machen'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAdmin(profile.id, profile.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;
