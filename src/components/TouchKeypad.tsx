import React from 'react';
import { Button } from "@/components/ui/button";
import { Delete } from 'lucide-react';

interface TouchKeypadProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  allowDecimal?: boolean;
  className?: string;
}

const TouchKeypad: React.FC<TouchKeypadProps> = ({ onInput, onBackspace, allowDecimal = false, className = "" }) => {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [allowDecimal ? '.' : '', '0', 'DEL']
  ];

  return (
    <div className={`grid grid-cols-3 gap-3 p-4 bg-white rounded-lg shadow-lg border ${className}`}>
      {numbers.map((row, rowIndex) => 
        row.map((key, keyIndex) => {
          // Skip empty keys (when decimal is not allowed)
          if (key === '') return null;
          
          return (
            <Button
              key={`${rowIndex}-${keyIndex}`}
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={() => {
                console.log('TouchKeypad clicked:', key); // Debug log
                if (key === 'DEL') {
                  onBackspace();
                } else {
                  onInput(key);
                }
              }}
            >
              {key === 'DEL' ? <Delete className="h-5 w-5" /> : key}
            </Button>
          );
        }).filter(Boolean)
      )}
    </div>
  );
};

export default TouchKeypad;