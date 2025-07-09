
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Lock } from 'lucide-react';
import { toast } from "sonner";

interface SettingsPasswordPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SettingsPasswordPrompt: React.FC<SettingsPasswordPromptProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Check password
    if (password === '2034') {
      toast.success('Zugang gewährt!');
      onSuccess();
      setPassword('');
    } else {
      toast.error('Falsches Passwort!');
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Einstellungen</span>
          </DialogTitle>
          <DialogDescription>
            Geben Sie das Passwort ein, um auf die Einstellungen zuzugreifen
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-password" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Passwort</span>
                </Label>
                <Input
                  id="settings-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading || !password}>
                  {isLoading ? 'Prüfe...' : 'Zugriff'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPasswordPrompt;
