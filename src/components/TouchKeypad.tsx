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
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['', '0', 'DEL']
  ];

  return (
    <div className={`grid grid-cols-3 gap-4 p-6 bg-white rounded-lg shadow-lg border ${className}`}>
    {numbers.map((row, rowIndex) => 
      row.map((key, keyIndex) => {
        // Render invisible placeholder for empty keys to maintain grid layout
        if (key === '') {
          return (
            <div 
              key={`${rowIndex}-${keyIndex}`}
              className="h-20 aspect-square"
            />
          );
        }
        
        return (
          <Button
            key={`${rowIndex}-${keyIndex}`}
            variant="outline"
            className="h-20 aspect-square text-2xl font-semibold"
            onClick={() => {
              console.log('TouchKeypad clicked:', key); // Debug log
              if (key === 'DEL') {
                onBackspace();
              } else {
                onInput(key);
              }
            }}
          >
            {key === 'DEL' ? <Delete className="h-6 w-6" /> : key}
          </Button>
        );
      })
    )}
    </div>
  );
};

export default TouchKeypad;