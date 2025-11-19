import React from 'react';
import companyLogo from '@/assets/company-logo.png';

const Logo: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50 transition-opacity hover:opacity-70">
      <span className="text-xs text-muted-foreground">Built by</span>
      <img 
        src={companyLogo} 
        alt="Company Logo" 
        className="h-8 w-auto object-contain"
      />
    </div>
  );
};

export default Logo;