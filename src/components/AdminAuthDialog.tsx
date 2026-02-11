import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield } from 'lucide-react';
import { toast } from "sonner";
import { isAdmin } from '@/lib/authz';

interface AdminAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminAuthDialog: React.FC<AdminAuthDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleAdminCheck = async () => {
    setIsChecking(true);
    
    try {
      const admin = await isAdmin();

      if (admin) {
        onSuccess();
        onClose();
      } else {
        toast.error('Kein Zugriff. Nur Admins können diese Aktion ausführen.');
      }
    } catch (error) {
      console.error('Unexpected error during admin check:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Administrator-Freigabe</span>
          </DialogTitle>
          <DialogDescription>
            Diese Aktion erfordert Administrator-Rechte. Klicken Sie auf "Admin prüfen" um fortzufahren.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isChecking}>
            Abbrechen
          </Button>
          <Button onClick={handleAdminCheck} disabled={isChecking}>
            <Shield className="h-4 w-4 mr-2" />
            {isChecking ? 'Prüfe...' : 'Admin prüfen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAuthDialog;
