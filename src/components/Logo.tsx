import React, { useState, useEffect } from 'react';
import { getLogo } from '@/lib/settingsStorage';

const Logo: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const updateLogo = () => {
      setLogoUrl(getLogo());
    };

    updateLogo();

    // Listen for storage changes to update logo when changed in settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app_logo') {
        updateLogo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events when logo is updated in the same tab
    const handleLogoUpdate = () => {
      updateLogo();
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

  if (!logoUrl) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50 transition-opacity hover:opacity-70">
      <span className="text-xs text-gray-500">Erstellt von</span>
      <img 
        src={logoUrl} 
        alt="Logo" 
        className="w-10 h-10 object-contain rounded"
        style={{ maxWidth: '40px', maxHeight: '40px' }}
      />
    </div>
  );
};

export default Logo;