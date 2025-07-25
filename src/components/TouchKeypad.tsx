import React from 'react';
import { Button } from "@/components/ui/button";
import { Delete } from 'lucide-react';

interface TouchKeypadProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  className?: string;
}

const TouchKeypad: React.FC<TouchKeypadProps> = ({ onInput, onBackspace, className = "" }) => {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'DEL']
  ];

  return (
    <div className={`grid grid-cols-3 gap-3 p-4 bg-white rounded-lg shadow-lg border ${className}`}>
      {numbers.map((row, rowIndex) => 
        row.map((key, keyIndex) => (
          <Button
            key={`${rowIndex}-${keyIndex}`}
            variant="outline"
            className="h-12 text-lg font-semibold"
            onClick={() => {
              if (key === 'DEL') {
                onBackspace();
              } else {
                onInput(key);
              }
            }}
          >
            {key === 'DEL' ? <Delete className="h-5 w-5" /> : key}
          </Button>
        ))
      )}
    </div>
  );
};

export default TouchKeypad;