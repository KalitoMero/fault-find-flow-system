import React, { useEffect, useRef } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string, newCursorPosition: number) => void;
  onClose: () => void;
  cursorPosition: number;
  layoutType?: 'default' | 'numeric';
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ value, onChange, onClose, cursorPosition, layoutType = 'default' }) => {
  const keyboardRef = useRef<any>(null);

  useEffect(() => {
    if (keyboardRef.current) {
      keyboardRef.current.setInput(value);
    }
  }, [value]);

  const handleKeyPress = (button: string) => {
    const pos = cursorPosition;
    
    if (button === '{bksp}' && pos > 0) {
      // Zeichen VOR dem Cursor löschen
      const newValue = value.substring(0, pos - 1) + value.substring(pos);
      onChange(newValue, pos - 1);
    } else if (button === '{space}') {
      // Leerzeichen an Cursor-Position einfügen
      const newValue = value.substring(0, pos) + ' ' + value.substring(pos);
      onChange(newValue, pos + 1);
    } else if (button === '{enter}') {
      // Zeilenumbruch an Cursor-Position einfügen
      const newValue = value.substring(0, pos) + '\n' + value.substring(pos);
      onChange(newValue, pos + 1);
    } else if (button === '{tab}') {
      // Tab an Cursor-Position einfügen
      const newValue = value.substring(0, pos) + '\t' + value.substring(pos);
      onChange(newValue, pos + 1);
    } else if (!button.startsWith('{')) {
      // Zeichen an Cursor-Position einfügen
      const newValue = value.substring(0, pos) + button + value.substring(pos);
      onChange(newValue, pos + 1);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary shadow-xl animate-slide-in-bottom max-h-[280px]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50">
        <h3 className="text-xs font-semibold text-foreground">Tastatur</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="p-1 keyboard-container">
        <Keyboard
          keyboardRef={(r: any) => (keyboardRef.current = r)}
          layout={
            layoutType === 'numeric' 
              ? {
                  default: [
                    '7 8 9 {bksp}',
                    '4 5 6 {bksp}',
                    '1 2 3 {bksp}',
                    '. 0 - {bksp}'
                  ]
                }
              : {
                  default: [
                    '1 2 3 4 5 6 7 8 9 0 ß {bksp}',
                    'q w e r t z u i o p ü +',
                    'a s d f g h j k l ö ä #',
                    '{shift} y x c v b n m , . - {shift}',
                    '{space}'
                  ],
                  shift: [
                    '! " § $ % & / ( ) = ? {bksp}',
                    'Q W E R T Z U I O P Ü *',
                    'A S D F G H J K L Ö Ä \'',
                    '{shift} Y X C V B N M ; : _ {shift}',
                    '{space}'
                  ]
                }
          }
          display={{
            '{bksp}': '⌫',
            '{shift}': '⇧',
            '{space}': 'Leertaste'
          }}
          onKeyPress={handleKeyPress}
          theme="hg-theme-default hg-layout-default"
          buttonTheme={[
            {
              class: 'hg-special-button',
              buttons: '{bksp} {shift} {space}'
            }
          ]}
        />
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .keyboard-container .hg-theme-default {
          background-color: hsl(var(--background));
          padding: 4px;
          max-height: 220px;
        }
        
        .keyboard-container .hg-button {
          background: hsl(var(--secondary));
          color: hsl(var(--secondary-foreground));
          border: 1px solid hsl(var(--border));
          font-size: 14px;
          height: 38px;
          margin: 2px;
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: all 0.15s ease;
        }
        
        .keyboard-container .hg-button:active,
        .keyboard-container .hg-button:hover {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          transform: scale(0.95);
        }
        
        .keyboard-container .hg-special-button {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-weight: 600;
        }
        
        @keyframes slide-in-bottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-bottom {
          animation: slide-in-bottom 0.3s ease-out;
        }
      `}} />
    </div>
  );
};

export default VirtualKeyboard;
