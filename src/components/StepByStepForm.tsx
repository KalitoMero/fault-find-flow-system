import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Edit3, Package, Hash, User, FileText, Settings, Home } from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getEmployees, Employee } from '@/lib/settingsStorage';
import { getExcelData } from '@/lib/excelStorage';
import AudioRecorderSimple from './AudioRecorderSimple';
import TouchKeypad from './TouchKeypad';
import { toast } from "sonner";

interface StepByStepFormProps {
  onReportCreated: () => void;
  onClose: () => void;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'textarea';
  required: boolean;
  completed: boolean;
  icon: React.ReactNode;
  placeholder: string;
}

const StepByStepForm: React.FC<StepByStepFormProps> = ({ onReportCreated, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [originalStep, setOriginalStep] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [audioFiles, setAudioFiles] = useState<{
    problemDescription?: string;
    correctiveAction?: string;
  }>({});
  const [showKeypad, setShowKeypad] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fields, setFields] = useState<FormField[]>([
    {
      id: 'orderNumber',
      label: 'Auftragsnummer',
      value: '',
      type: 'text',
      required: true,
      completed: false,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. AUF-2024-001'
    },
    {
      id: 'afoNumber',
      label: 'AFO-Nummer',
      value: '',
      type: 'text',
      required: false,
      completed: false,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. AFO-12345'
    },
    {
      id: 'defectiveQuantity',
      label: 'Menge',
      value: '',
      type: 'text',
      required: true,
      completed: false,
      icon: <Package className="h-4 w-4" />,
      placeholder: 'Anzahl'
    },
    {
      id: 'personalNumber',
      label: 'Personalnummer',
      value: '',
      type: 'text',
      required: true,
      completed: false,
      icon: <User className="h-4 w-4" />,
      placeholder: 'Personalnummer'
    },
    {
      id: 'problemDescription',
      label: 'Problembeschreibung',
      value: '',
      type: 'textarea',
      required: true,
      completed: false,
      icon: <FileText className="h-4 w-4" />,
      placeholder: 'Beschreiben Sie das Problem...'
    },
    {
      id: 'correctiveAction',
      label: 'Korrekturmaßnahme',
      value: '',
      type: 'textarea',
      required: false,
      completed: false,
      icon: <Settings className="h-4 w-4" />,
      placeholder: 'Beschreiben Sie die Korrekturmaßnahme...'
    }
  ]);

  useEffect(() => {
    setEmployees(getEmployees());
  }, []);

  // Parse AFO from order number if it contains a dot (when moving to next step)
  const parseOrderNumber = (orderNum: string) => {
    const dotIndex = orderNum.indexOf('.');
    if (dotIndex !== -1) {
      const orderPart = orderNum.substring(0, dotIndex);
      const afoPart = orderNum.substring(dotIndex + 1);
      
      setFields(prev => prev.map(field => {
        if (field.id === 'orderNumber') {
          return { ...field, value: orderPart };
        }
        if (field.id === 'afoNumber') {
          return { ...field, value: afoPart, completed: true };
        }
        return field;
      }));
    }
  };

  // Check Excel data for auto-completion
  const checkExcelData = async (orderNumber: string, afoNumber?: string) => {
    const excelData = getExcelData();
    if (excelData && excelData.data.length > 0) {
      const matchingRow = excelData.data.find(row => 
        row[excelData.settings.orderNumberColumn] === orderNumber ||
        (afoNumber && row[excelData.settings.afoNumberColumn] === afoNumber)
      );
      
      if (matchingRow) {
        // Auto-fill additional data from Excel
        const additionalInfo = excelData.settings.additionalColumns
          .map(col => `${col.name}: ${matchingRow[col.column]}`)
          .join('\n');
        
        if (additionalInfo) {
          setFields(prev => prev.map(field => {
            if (field.id === 'problemDescription' && !field.value) {
              return { ...field, value: additionalInfo };
            }
            return field;
          }));
        }
      }
    }
  };

  const handleFieldUpdate = (fieldId: string, value: string) => {
    setFields(prev => prev.map(field => {
      if (field.id === fieldId) {
        const updated = { ...field, value, completed: value.length > 0 };
        
        // Special handling for order number parsing
        if (fieldId === 'orderNumber' && value.includes('.')) {
          setTimeout(() => parseOrderNumber(value), 100);
        }
        
        return updated;
      }
      return field;
    }));
    
    // Check Excel data when order number or AFO is updated
    if (fieldId === 'orderNumber' || fieldId === 'afoNumber') {
      const orderField = fields.find(f => f.id === 'orderNumber');
      const afoField = fields.find(f => f.id === 'afoNumber');
      setTimeout(() => checkExcelData(
        fieldId === 'orderNumber' ? value : orderField?.value || '',
        fieldId === 'afoNumber' ? value : afoField?.value
      ), 100);
    }
  };

  const handleNext = () => {
    const currentField = fields[currentStep];
    if (currentField.required && !currentField.value) {
      toast.error(`${currentField.label} ist ein Pflichtfeld`);
      return;
    }

    setFields(prev => prev.map((field, index) => 
      index === currentStep ? { ...field, completed: true } : field
    ));

    // Parse order number when leaving the field
    if (currentStep === 0 && currentField.value.includes('.')) {
      parseOrderNumber(currentField.value);
    }

    // Return to original step or go to next step
    if (originalStep > currentStep && originalStep < fields.length) {
      setCurrentStep(originalStep);
      setOriginalStep(0); // Reset original step
    } else if (currentStep < fields.length - 1) {
      // Skip AFO if already parsed from order number
      if (currentStep === 0 && fields[1].completed) {
        setCurrentStep(2);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleFieldClick = (index: number) => {
    if (fields[index].completed) {
      setOriginalStep(currentStep); // Remember where we came from
      setCurrentStep(index);
    }
  };

  const handleKeypadInput = (value: string) => {
    const currentField = fields[currentStep];
    handleFieldUpdate(currentField.id, currentField.value + value);
  };

  const handleKeypadBackspace = () => {
    const currentField = fields[currentStep];
    handleFieldUpdate(currentField.id, currentField.value.slice(0, -1));
  };

  const handleSubmit = async () => {
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !f.value);
    
    if (missingFields.length > 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const employee = employees.find(emp => emp.id === fields.find(f => f.id === 'personalNumber')?.value);
    if (!employee) {
      toast.error('Mitarbeiter mit dieser Personalnummer nicht gefunden');
      return;
    }

    setIsSubmitting(true);

    try {
      const report = {
        id: generateErrorReportId(),
        orderNumber: fields.find(f => f.id === 'orderNumber')?.value || '',
        afoNumber: fields.find(f => f.id === 'afoNumber')?.value || undefined,
        defectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        totalDefectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        creator: employee.name,
        personalNumber: employee.id,
        machine: undefined,
        problemDescription: fields.find(f => f.id === 'problemDescription')?.value || '',
        errorCause: fields.find(f => f.id === 'problemDescription')?.value || '',
        correctiveAction: fields.find(f => f.id === 'correctiveAction')?.value || '',
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: '', // Will be assigned based on department
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };

      saveErrorReport(report);
      onReportCreated();
      onClose();
      
      toast.success('Fehlermeldung erfolgreich erstellt!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentField = fields[currentStep];
  const completedFields = fields.filter(f => f.completed && f.id !== currentField.id);
  const isLastStep = currentStep === fields.length - 1;
  const showNumericKeypad = currentField && (currentField.type === 'number' || currentField.type === 'text');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Back to Home Button - Fixed top left */}
      <div className="fixed top-4 left-4 z-10">
        <Button 
          onClick={onClose}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Zurück zur Startseite
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-4 pt-16">

        {/* Completed Fields */}
        {completedFields.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Number fields in a row - 4 columns with AFO smaller */}
                <div className="grid grid-cols-4 gap-3">
                  {completedFields.filter(f => f.type !== 'textarea').map((field, index) => (
                    <div
                      key={field.id}
                      onClick={() => handleFieldClick(fields.findIndex(f => f.id === field.id))}
                      className={`flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors ${
                        field.id === 'afoNumber' ? 'col-span-1' : 'col-span-1'
                      }`}
                    >
                      {field.icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-green-800">{field.label}</p>
                        <p className="text-sm text-green-600 truncate">{field.value}</p>
                      </div>
                      <Edit3 className="h-3 w-3 text-green-600" />
                    </div>
                  ))}
                </div>
                
                {/* Text areas full width */}
                {completedFields.filter(f => f.type === 'textarea').map((field, index) => (
                  <div
                    key={field.id}
                    onClick={() => handleFieldClick(fields.findIndex(f => f.id === field.id))}
                    className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  >
                    {field.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">{field.label}</p>
                      <div className="text-sm text-green-600">
                        <p className="whitespace-pre-wrap break-words">{field.value}</p>
                      </div>
                    </div>
                    <Edit3 className="h-4 w-4 text-green-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Field */}
        <Card className="bg-white shadow-xl min-h-[600px] flex flex-col justify-center">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl flex items-center justify-center gap-3">
              {currentField.icon}
              {currentField.label}
              {currentField.required && <span className="text-red-500">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center space-y-4">
              {currentField.type === 'textarea' ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="flex gap-2 items-start">
                    <Textarea
                      value={currentField.value}
                      onChange={(e) => handleFieldUpdate(currentField.id, e.target.value)}
                      placeholder={currentField.placeholder}
                      rows={4}
                      className="text-center text-lg flex-1"
                    />
                    {(currentField.id === 'problemDescription' || currentField.id === 'correctiveAction') && (
                      <AudioRecorderSimple 
                        onTranscription={(transcription, audioBlob) => {
                          handleFieldUpdate(currentField.id, transcription);
                          setAudioFiles(prev => ({...prev, [currentField.id]: audioBlob}));
                        }}
                        label={`${currentField.label} aufnehmen`}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Input
                    type="text"
                    value={currentField.value}
                    onChange={(e) => handleFieldUpdate(currentField.id, e.target.value)}
                    placeholder={currentField.placeholder}
                    className="text-center text-xl max-w-md h-14"
                    pattern={currentField.id === 'orderNumber' ? '[0-9.]*' : '[0-9]*'}
                    inputMode={currentField.id === 'orderNumber' ? 'decimal' : 'numeric'}
                  />
                  
                  {/* Touch Keypad - Always visible for non-textarea fields */}
                  <TouchKeypad
                    onInput={handleKeypadInput}
                    onBackspace={handleKeypadBackspace}
                    className="mt-4"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-6">
              {isLastStep ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Settings className="h-5 w-5 mr-2 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Meldung erstellen
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="px-8 py-3 text-lg"
                  size="lg"
                >
                  Weiter
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepByStepForm;