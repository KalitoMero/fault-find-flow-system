import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Edit3, Package, Hash, User, FileText, Settings, Home, MapPin } from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getEmployees, Employee, getDepartments } from '@/lib/settingsStorage';
import { getExcelData } from '@/lib/excelStorage';
import AudioRecorderSimple from './AudioRecorderSimple';
import AudioRecorderN8n from './AudioRecorderN8n';
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
  const [excelDepartment, setExcelDepartment] = useState<string>('');
  const [assignedTeamLeader, setAssignedTeamLeader] = useState<string>('System');
  const [additionalExcelData, setAdditionalExcelData] = useState<Record<string, any>>({});
  const [showReview, setShowReview] = useState(false);
  
  // N8N Settings State - Always enabled
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');

  // Auto-focus the first input field
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Helper function to get team leader display name
  const getTeamLeaderDisplayName = (username: string): string => {
    const employee = employees.find(emp => emp.account?.username === username);
    return employee ? employee.name : username;
  };

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
      required: true,
      completed: false,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. AFO-12345'
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

  // Load N8N settings on component mount
  const loadN8nSettings = useCallback(() => {
    try {
      const url = localStorage.getItem('n8n_webhook_url') || '';
      setN8nWebhookUrl(url);
      console.log(`✅ N8N integration ACTIVATED (always on)`);
    } catch (error) {
      console.error('❌ StepByStepForm - Error loading N8N settings:', error);
    }
  }, []);

  useEffect(() => {
    setEmployees(getEmployees());
    loadN8nSettings();
    
    // Listen for N8N settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'n8n_enabled' || e.key === 'n8n_webhook_url') {
        console.log('📡 StepByStepForm - Storage change detected:', e.key, e.newValue);
        loadN8nSettings();
      }
    };
    
    const handleN8nSettingsUpdate = () => {
      console.log('📡 StepByStepForm - N8N settings update event received');
      loadN8nSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('n8n-settings-updated', handleN8nSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('n8n-settings-updated', handleN8nSettingsUpdate);
    };
  }, [loadN8nSettings]);

  // useEffect für Excel-Überprüfung wenn AFO-Nummer sich ändert
  useEffect(() => {
    const orderField = fields.find(f => f.id === 'orderNumber');
    const afoField = fields.find(f => f.id === 'afoNumber');
    
    if (orderField?.value && afoField?.value) {
      console.log('useEffect triggered: checking Excel data for', orderField.value, afoField.value);
      setTimeout(() => checkExcelData(orderField.value, afoField.value), 100);
    }
  }, [fields.find(f => f.id === 'afoNumber')?.value]);

  // Finde den passenden Teamleiter basierend auf der Excel-Abteilung
  const findTeamLeaderForDepartment = (departmentName: string): string => {
    const employees = getEmployees();
    const departments = getDepartments();
    
    // Finde die Abteilung basierend auf dem Namen
    const department = departments.find(d => d.name === departmentName);
    if (!department) {
      console.log('No department found for name:', departmentName);
      return 'System';
    }
    
    // Finde Teamleiter in dieser Abteilung
    const teamLeader = employees.find(emp => 
      emp.isTeamLeader && 
      emp.departmentId === department.id && 
      emp.account?.username
    );
    
    if (teamLeader && teamLeader.account?.username) {
      console.log('Team leader found for department', departmentName, ':', teamLeader.account.username);
      return teamLeader.account.username;
    }
    
    console.log('No team leader found for department:', departmentName);
    return 'System';
  };

  // Parse AFO from order number if it contains a dot (when moving to next step)
  const parseOrderNumber = (orderNum: string) => {
    console.log('parseOrderNumber called with:', orderNum);
    const dotIndex = orderNum.indexOf('.');
    if (dotIndex !== -1) {
      const orderPart = orderNum.substring(0, dotIndex);
      const afoPart = orderNum.substring(dotIndex + 1);
      console.log('Parsed order:', orderPart, 'AFO:', afoPart);
      
      setFields(prev => prev.map(field => {
        if (field.id === 'orderNumber') {
          return { ...field, value: orderPart };
        }
        if (field.id === 'afoNumber') {
          return { ...field, value: afoPart, completed: true };
        }
        return field;
      }));
      
      // Excel-Überprüfung nach dem Parsen mit Delay
      setTimeout(() => {
        console.log('Triggering Excel check after parseOrderNumber');
        checkExcelData(orderPart, afoPart);
      }, 200);
    }
  };

  // Check Excel data for auto-completion
  const checkExcelData = async (orderNumber: string, afoNumber?: string) => {
    console.log('checkExcelData called with:', { orderNumber, afoNumber });
    const excelData = await getExcelData();
    if (excelData && excelData.data.length > 0) {
      console.log('Excel data found:', excelData.data.length, 'rows');
      console.log('Excel settings:', excelData.settings);
      
      // Convert column numbers to column names (headers)
      const headers = Object.keys(excelData.data[0]);
      console.log('Available headers:', headers);
      
      const orderColumnIndex = parseInt(excelData.settings.orderNumberColumn) - 1;
      const afoColumnIndex = parseInt(excelData.settings.afoNumberColumn) - 1;
      const articleColumnIndex = excelData.settings.articleNumberColumn ? parseInt(excelData.settings.articleNumberColumn) - 1 : null;
      const departmentColumnIndex = excelData.settings.departmentColumn ? parseInt(excelData.settings.departmentColumn) - 1 : null;
      
      const orderColumnName = headers[orderColumnIndex];
      const afoColumnName = headers[afoColumnIndex];
      const articleColumnName = articleColumnIndex !== null ? headers[articleColumnIndex] : null;
      const departmentColumnName = departmentColumnIndex !== null ? headers[departmentColumnIndex] : null;
      
      console.log('Column mappings:', { orderColumnName, afoColumnName, articleColumnName, departmentColumnName });
      console.log('Looking for order:', orderNumber, 'and AFO:', afoNumber);
      
      // Suche nach einer Zeile wo BEIDE Nummern übereinstimmen
      const matchingRow = excelData.data.find(row => {
        const orderValue = row[orderColumnName]?.toString().trim();
        const afoValue = row[afoColumnName]?.toString().trim();
        const orderMatch = orderValue === orderNumber.toString().trim();
        const afoMatch = afoNumber && afoValue === afoNumber.toString().trim();
        console.log('Checking row:', { 
          orderValue, 
          afoValue, 
          orderMatch, 
          afoMatch,
          searchOrder: orderNumber.toString().trim(),
          searchAfo: afoNumber?.toString().trim()
        });
        // Beide Nummern müssen übereinstimmen
        return orderMatch && afoMatch;
      });
      
      if (matchingRow) {
        console.log('Matching row found (both numbers match):', matchingRow);
        
        // Auto-fill department if available
        if (departmentColumnName && matchingRow[departmentColumnName]) {
          const departmentName = matchingRow[departmentColumnName];
          console.log('Department found:', departmentName);
          setExcelDepartment(departmentName);
          
          // Finde und setze den passenden Teamleiter
          const teamLeader = findTeamLeaderForDepartment(departmentName);
          setAssignedTeamLeader(teamLeader);
          console.log('Assigned team leader:', teamLeader);
        } else {
          console.log('No department column or value found');
          setExcelDepartment('');
           setAssignedTeamLeader('System');
         }
         
         // Speichere alle zusätzlichen Excel-Spalten aus der passenden Zeile, inklusive Artikelnummer
         const additionalExcelData: Record<string, any> = {};
         
          // Füge Artikelnummer als primäres Feld hinzu wenn verfügbar
          if (articleColumnName && matchingRow[articleColumnName]) {
            additionalExcelData.Artikelnummer = matchingRow[articleColumnName];
          }
          
          // Füge Artikelbezeichnung als primäres Feld hinzu wenn verfügbar
          if (excelData.settings.articleDescriptionColumnName && matchingRow[excelData.settings.articleDescriptionColumnName]) {
            additionalExcelData.Artikelbezeichnung = matchingRow[excelData.settings.articleDescriptionColumnName];
          }
          
         excelData.settings.additionalColumns.forEach(col => {
           const colIndex = parseInt(col.column) - 1;
           const colName = headers[colIndex];
           const value = matchingRow[colName];
           
           console.log('Processing additional column:', {
             columnName: col.name,
             columnIndex: col.column,
             colIndex,
             colName,
             value,
             availableKeys: Object.keys(matchingRow)
           });
           
           if (value !== undefined && value !== null && value !== '') {
             additionalExcelData[col.name] = value;
           }
         });
        
        // Speichere die zusätzlichen Excel-Daten im State
        setAdditionalExcelData(additionalExcelData);
        console.log('Additional Excel data saved:', additionalExcelData);
      } else {
        console.log('No matching row found where both order number and AFO match');
        setExcelDepartment(''); // Reset if no match
        setAssignedTeamLeader('System');
      }
    }
  };

  // Performance optimized form validation
  const isFormComplete = useCallback(() => {
    const requiredFields = fields.filter(f => f.required);
    return requiredFields.every(f => f.value.trim().length > 0);
  }, [fields]);

  const handleFieldUpdate = useCallback((fieldId: string, value: string) => {
    console.log('handleFieldUpdate called:', fieldId, value);
    setFields(prev => prev.map(field => {
      if (field.id === fieldId) {
        const updated = { ...field, value, completed: value.length > 0 };
        return updated;
      }
      return field;
    }));
    
    // Check Excel data when order number or AFO is updated (but not during parsing)
    if (fieldId === 'orderNumber' || fieldId === 'afoNumber') {
      const orderField = fields.find(f => f.id === 'orderNumber');
      const afoField = fields.find(f => f.id === 'afoNumber');
      
      const orderNumber = fieldId === 'orderNumber' ? value : orderField?.value || '';
      const afoNumber = fieldId === 'afoNumber' ? value : afoField?.value || '';
      
      console.log('Field update check:', { fieldId, orderNumber, afoNumber });
      
      // Nur prüfen wenn BEIDE Nummern vorhanden sind
      if (orderNumber && afoNumber) {
        console.log('Both numbers present, triggering Excel check');
        setTimeout(() => checkExcelData(orderNumber, afoNumber), 100);
      }
    }
  }, [fields]);

  const handleNext = () => {
    const currentField = fields[currentStep];
    if (currentField.required && !currentField.value) {
      toast.error(`${currentField.label} ist ein Pflichtfeld`);
      return;
    }

    // Parse order number when leaving the order number field (step 0)
    if (currentStep === 0 && currentField.value.includes('.')) {
      console.log('Parsing order number:', currentField.value); // Debug log
      parseOrderNumber(currentField.value);
      
      // Mark current field as completed
      setFields(prev => prev.map((field, index) => 
        index === currentStep ? { ...field, completed: true } : field
      ));
      
      // Skip directly to step 2 (defectiveQuantity) since AFO is auto-filled
      setCurrentStep(2);
      return;
    }

    setFields(prev => prev.map((field, index) => 
      index === currentStep ? { ...field, completed: true } : field
    ));

    // Excel-Überprüfung beim Weiterklicken wenn beide Nummern vorhanden sind
    const orderField = fields.find(f => f.id === 'orderNumber');
    const afoField = fields.find(f => f.id === 'afoNumber');
    if (orderField?.value && afoField?.value) {
      console.log('handleNext: triggering Excel check');
      setTimeout(() => checkExcelData(orderField.value, afoField.value), 100);
    }

    // Return to original step or go to next step
    if (originalStep > currentStep && originalStep < fields.length) {
      setCurrentStep(originalStep);
      setOriginalStep(0); // Reset original step
    } else if (currentStep < fields.length - 1) {
      setCurrentStep(currentStep + 1);
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
    console.log('handleKeypadInput called with:', value, 'for field:', currentField.id); // Debug log
    
    // Allow decimal point only for order number field
    if (value === '.' && currentField.id !== 'orderNumber') {
      console.log('Decimal point blocked for field:', currentField.id); // Debug log
      return;
    }
    
    handleFieldUpdate(currentField.id, currentField.value + value);
  };

  const handleKeypadBackspace = () => {
    const currentField = fields[currentStep];
    handleFieldUpdate(currentField.id, currentField.value.slice(0, -1));
  };

  const handleSubmit = useCallback(async () => {
    // Show review first if all fields are complete
    if (isFormComplete() && !showReview) {
      setShowReview(true);
      return;
    }

    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !f.value);
    
    if (missingFields.length > 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
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
        creator: fields.find(f => f.id === 'personalNumber')?.value || '',
        personalNumber: fields.find(f => f.id === 'personalNumber')?.value || '',
        machine: undefined,
        detectionLocation: fields.find(f => f.id === 'detectionLocation')?.value || undefined,
        problemDescription: fields.find(f => f.id === 'problemDescription')?.value || '',
        errorCause: fields.find(f => f.id === 'problemDescription')?.value || '',
        correctiveAction: fields.find(f => f.id === 'correctiveAction')?.value || '',
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: assignedTeamLeader,
        excelDepartment: excelDepartment || undefined,
        additionalExcelData: Object.keys(additionalExcelData).length > 0 ? additionalExcelData : undefined,
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
  }, [fields, isFormComplete, showReview, assignedTeamLeader, excelDepartment, additionalExcelData, audioFiles, onReportCreated, onClose]);

  const currentField = fields[currentStep];
  const completedFields = fields.filter(f => f.completed && f.id !== currentField.id);
  const isLastStep = currentStep === fields.length - 1;
  const showNumericKeypad = currentField && (currentField.type === 'number' || currentField.type === 'text');

  // Review Screen
  if (showReview) {
    return (
      <div className="min-h-screen bg-light-blue p-4">
        <div className="fixed top-4 left-4 z-10">
          <Button 
            onClick={() => setShowReview(false)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Zurück zum Formular
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 pt-16">
          <Card className="bg-white shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl flex items-center justify-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Fehlermeldung überprüfen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* All form fields in review */}
              <div className="grid grid-cols-2 gap-4">
                {fields.filter(f => f.type !== 'textarea').map((field) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {field.icon}
                      <span className="font-medium text-gray-700">{field.label}</span>
                    </div>
                    <p className="text-lg font-semibold">{field.value || 'Nicht angegeben'}</p>
                  </div>
                ))}
              </div>
              
              {/* Text areas full width */}
              {fields.filter(f => f.type === 'textarea' && f.value).map((field) => (
                <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {field.icon}
                    <span className="font-medium text-gray-700">{field.label}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-900">{field.value}</p>
                </div>
              ))}

              {/* Excel data if available */}
              {(excelDepartment || Object.keys(additionalExcelData).length > 0) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Excel-Daten</h4>
                  <div className="space-y-1 text-sm">
                    {excelDepartment && (
                      <div><span className="text-blue-600">Abteilung:</span> {excelDepartment}</div>
                    )}
                    {assignedTeamLeader !== 'System' && (
                      <div><span className="text-blue-600">Teamleiter:</span> {getTeamLeaderDisplayName(assignedTeamLeader)}</div>
                    )}
                    {Object.entries(additionalExcelData).map(([key, value]) => (
                      <div key={key}><span className="text-blue-600">{key}:</span> {value}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-6">
                <Button 
                  onClick={() => setShowReview(false)}
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  Bearbeiten
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700"
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-blue p-4">
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


      <div className="max-w-4xl mx-auto space-y-4">

        {/* All Fields Display */}
        <div className="space-y-6">
          {fields.map((field, index) => {
            const isCurrentField = index === currentStep;
            const isCompleted = field.completed;
            const fieldValue = field.value;
            
            return (
              <Card 
                key={field.id}
                className={`transition-all duration-300 cursor-pointer ${
                  isCurrentField 
                    ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary border-2 shadow-xl scale-105 transform'
                    : isCompleted
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => !isCurrentField && isCompleted && handleFieldClick(index)}
              >
                <CardHeader className="pb-4">
                  <CardTitle className={`flex items-center justify-center gap-3 transition-all duration-300 ${
                    isCurrentField 
                      ? 'text-2xl text-primary'
                      : isCompleted
                        ? 'text-lg text-green-700'
                        : 'text-lg text-gray-600'
                  }`}>
                    <div className={`transition-all duration-300 ${
                      isCurrentField ? 'scale-125' : 'scale-100'
                    }`}>
                      {field.icon}
                    </div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                    {isCompleted && !isCurrentField && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className={`transition-all duration-300 ${
                  isCurrentField ? 'pb-8' : 'pb-4'
                }`}>
                  {isCurrentField ? (
                    // Active field - full input interface
                    <div className="space-y-6">
                      {field.type === 'textarea' ? (
                        <div className="space-y-4">
                          <div className="flex gap-2 items-start">
                            <Textarea
                              value={fieldValue}
                              onChange={(e) => handleFieldUpdate(field.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey && fieldValue.trim()) {
                                  e.preventDefault();
                                  handleNext();
                                }
                              }}
                              placeholder={field.placeholder}
                              rows={4}
                              className="text-center text-lg flex-1 border-primary/50 focus:border-primary"
                            />
                            {(field.id === 'problemDescription' || field.id === 'correctiveAction') && (
                              <AudioRecorderN8n 
                                key={field.id}
                                onTranscription={(transcription, audioBlob) => {
                                  handleFieldUpdate(field.id, transcription);
                                  if (audioBlob) {
                                    setAudioFiles(prev => ({...prev, [field.id]: audioBlob}));
                                  }
                                }}
                                label={`${field.label} aufnehmen`}
                                webhookUrl={n8nWebhookUrl}
                                useN8n={true}
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Input
                            type="text"
                            value={fieldValue}
                            onChange={(e) => handleFieldUpdate(field.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && fieldValue.trim()) {
                                e.preventDefault();
                                handleNext();
                              }
                            }}
                            placeholder={field.placeholder}
                            className="text-center text-xl h-14 border-primary/50 focus:border-primary"
                            pattern={field.id === 'orderNumber' ? '[0-9.]*' : '[0-9]*'}
                            inputMode={field.id === 'orderNumber' ? 'decimal' : 'numeric'}
                          />
                          
                          {/* Touch Keypad for active numeric fields */}
                          <TouchKeypad
                            onInput={handleKeypadInput}
                            onBackspace={handleKeypadBackspace}
                            allowDecimal={field.id === 'orderNumber'}
                            className="mt-4"
                          />
                        </div>
                      )}
                      
                      {/* Navigation buttons for active field */}
                      <div className="flex justify-center gap-4 pt-4">
                        {index === fields.length - 1 ? (
                          <Button 
                            onClick={handleSubmit}
                            disabled={isSubmitting || !isFormComplete()}
                            className={`px-8 py-3 text-lg transition-colors ${
                              isFormComplete() 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
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
                                {isFormComplete() ? 'Überprüfen' : 'Alle Pflichtfelder ausfüllen'}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleNext}
                            className="px-8 py-3 text-lg gradient-button"
                            size="lg"
                          >
                            Weiter
                            <ArrowRight className="h-5 w-5 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Completed or inactive field - show preview
                    <div className="text-center">
                      {fieldValue ? (
                        <div className={`p-3 rounded-lg ${
                          isCompleted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <p className={`${field.type === 'textarea' ? 'whitespace-pre-wrap' : ''} ${
                            field.type === 'textarea' ? 'text-sm' : 'text-lg font-medium'
                          }`}>
                            {field.type === 'textarea' && fieldValue.length > 100 
                              ? `${fieldValue.substring(0, 100)}...`
                              : fieldValue
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 text-gray-500 rounded-lg">
                          <p className="text-sm italic">{field.placeholder}</p>
                        </div>
                      )}
                      {isCompleted && !isCurrentField && (
                        <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          Klicken zum Bearbeiten
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepByStepForm;