import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  CheckCircle, 
  Printer, 
  Package, 
  Hash, 
  Users, 
  User, 
  MapPin, 
  FileText, 
  Settings,
  Sparkles,
  Building2,
  Edit,
  Send,
  Check,
  Loader
} from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getDepartments, getEmployees, getMachines, Department, Employee, Machine } from '@/lib/settingsStorage';
import { getExcelSettings, getExcelDataByOrderNumber } from '@/lib/excelStorage';
import { findTeamLeaderForResourceOrDepartment } from '@/lib/resourceStorage';
import AudioRecorderSimple from './AudioRecorderSimple';
import AudioRecorderN8n from './AudioRecorderN8n';
import SimpleCombobox from './SimpleCombobox';
import VirtualKeyboard from './VirtualKeyboard';
import { printErrorReport } from '@/lib/printUtils';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface ErrorReportFormModernProps {
  onReportCreated: () => void;
  refreshDepartments: boolean;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  onBlur?: () => void;
  onSelect?: (e: React.SyntheticEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}>(({ id, label, value, onChange, placeholder, required, type = "text", icon, onClick, onBlur, onSelect, onKeyDown }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`floating-label-input ${value || isFocused ? 'has-value' : ''}`}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onClick={(e) => {
            onClick?.();
            onSelect?.(e);
          }}
          onSelect={onSelect}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder=""
          required={required}
          className={`modern-input pt-4 ${icon ? 'pl-10' : 'pl-3'}`}
        />
        <Label htmlFor={id} className="floating-label">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      </div>
    </div>
  );
});

const FloatingLabelTextarea = React.forwardRef<HTMLTextAreaElement, {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  onClick?: () => void;
  onBlur?: () => void;
  onSelect?: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
}>(({ id, label, value, onChange, placeholder, required, rows = 3, onClick, onBlur, onSelect }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`floating-label-input ${value || isFocused ? 'has-value' : ''}`}>
      <div className="relative">
        <Textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
          }}
          onClick={(e) => {
            onClick?.();
            onSelect?.(e);
          }}
          onSelect={onSelect}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder=""
          required={required}
          rows={rows}
          className="modern-input pt-4 min-h-[160px] resize-none"
        />
        <Label htmlFor={id} className="floating-label">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      </div>
    </div>
  );
});

const ErrorReportFormModern: React.FC<ErrorReportFormModernProps> = ({ onReportCreated, refreshDepartments }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [afoNumber, setAfoNumber] = useState('');
  const [defectiveQuantity, setDefectiveQuantity] = useState('');
  const [machine, setMachine] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [audioFiles, setAudioFiles] = useState<{
    problemDescription?: string;
    correctiveAction?: string;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCreatedReport, setLastCreatedReport] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [useN8nWebhook, setUseN8nWebhook] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  
  // Excel data validation states
  const [excelDataFound, setExcelDataFound] = useState<boolean | null>(null);
  const [isSearchingExcel, setIsSearchingExcel] = useState(false);
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Virtual Keyboard State
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [activeKeyboardField, setActiveKeyboardField] = useState<'problemDescription' | 'correctiveAction' | 'orderNumber' | 'afoNumber' | 'defectiveQuantity' | null>(null);
  const blurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Cursor Position State
  const [cursorPositions, setCursorPositions] = useState({
    problemDescription: 0,
    correctiveAction: 0,
    orderNumber: 0,
    afoNumber: 0,
    defectiveQuantity: 0
  });
  
  // Refs für Textarea-Elemente
  const problemDescriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const correctiveActionRef = React.useRef<HTMLTextAreaElement>(null);
  const orderNumberRef = React.useRef<HTMLInputElement>(null);
  const afoNumberRef = React.useRef<HTMLInputElement>(null);
  const defectiveQuantityRef = React.useRef<HTMLInputElement>(null);
  
  const steps = [
    { id: 1, title: 'Grunddaten', icon: Package, description: 'Auftrag & Menge' },
    { id: 2, title: 'Zuordnung', icon: Users, description: 'Abteilung & Ersteller' },
    { id: 3, title: 'Beschreibung', icon: FileText, description: 'Problem & Lösung' }
  ];

  // Load global N8N webhook settings and listen for changes
  const loadN8nSettings = useCallback(async () => {
    try {
      const { data: settings } = await supabase
        .from('n8n_settings')
        .select('webhook_url, is_enabled')
        .is('user_id', null)
        .maybeSingle();
      
      const url = settings?.webhook_url || '';
      const enabled = settings?.is_enabled ?? true;
      
      setUseN8nWebhook(enabled);
      setN8nWebhookUrl(url);
      console.log('🔧 ErrorReportFormModern - Global N8N Settings loaded:', { enabled, url });
    } catch (error) {
      console.error('❌ ErrorReportFormModern - Error loading N8N settings:', error);
    }
  }, []);

  useEffect(() => {
    loadN8nSettings();

    // Listen for custom events (for same-tab updates)
    const handleN8nSettingsUpdate = () => {
      console.log('🔄 ErrorReportFormModern - N8N settings update event received');
      loadN8nSettings();
    };

    window.addEventListener('n8n-settings-updated', handleN8nSettingsUpdate);

    return () => {
      window.removeEventListener('n8n-settings-updated', handleN8nSettingsUpdate);
    };
  }, [loadN8nSettings]);


  useEffect(() => {
    loadDepartmentsData();
  }, [refreshDepartments]);

  const loadDepartmentsData = async () => {
    setDepartments(await getDepartments());
    setEmployees(await getEmployees());
    setMachines(await getMachines());
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setLastCreatedReport(null);
      }, 120000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);



  // Check if all required fields are complete
  const isFormComplete = useCallback(() => {
    return !!(orderNumber && 
             afoNumber && 
             defectiveQuantity && 
             problemDescription && 
             selectedDepartment && 
             selectedEmployee);
  }, [orderNumber, afoNumber, defectiveQuantity, problemDescription, selectedDepartment, selectedEmployee]);

  // Determine current step based on filled fields
  useEffect(() => {
    if (orderNumber && afoNumber && defectiveQuantity) {
      if (selectedDepartment && selectedEmployee) {
        if (problemDescription) {
          setCurrentStep(3);
        } else {
          setCurrentStep(3);
        }
      } else {
        setCurrentStep(2);
      }
    } else {
      setCurrentStep(1);
    }
  }, [orderNumber, afoNumber, defectiveQuantity, selectedDepartment, selectedEmployee, problemDescription]);

  // Handle order number change with parsing
  const handleOrderNumberChange = useCallback((value: string) => {
    // Parse if contains dot
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      const orderPart = value.substring(0, dotIndex);
      const afoPart = value.substring(dotIndex + 1);
      
      setOrderNumber(orderPart);
      setAfoNumber(afoPart);
      setExcelDataFound(null); // Reset validation status
    } else {
      setOrderNumber(value);
      setExcelDataFound(null); // Reset validation status
    }
  }, []);

  // Auto-search when both fields are filled (for barcode scanner or manual input)
  useEffect(() => {
    const performSearch = async () => {
      if (!orderNumber || !afoNumber || excelDataFound !== null) {
        console.log('🔍 Excel search skipped:', { 
          orderNumber, 
          afoNumber, 
          excelDataFound,
          hasOrderNumber: !!orderNumber,
          hasAfoNumber: !!afoNumber,
          isNull: excelDataFound === null
        });
        return;
      }
      
      console.log('🚀 Starting Excel data search for:', { orderNumber, afoNumber });
      setIsSearchingExcel(true);
      
      try {
        const excelData = await getExcelDataByOrderNumber(orderNumber);
        console.log('📊 Excel data result:', excelData ? 'Found' : 'Not found');
        
        if (excelData) {
          setExcelDataFound(true);
          toast.success('Excel-Daten gefunden! ✓', {
            description: `Auftrag ${orderNumber} wurde in der Datenbank gefunden.`
          });
        } else {
          setExcelDataFound(false);
          toast.warning('Keine Excel-Daten gefunden', {
            description: `Für Auftragsnummer ${orderNumber} wurden keine Daten gefunden. Sie können trotzdem fortfahren.`
          });
        }
      } catch (error) {
        console.error('❌ Fehler beim Suchen der Excel-Daten:', error);
        toast.error('Fehler bei der Excel-Daten-Suche');
        setExcelDataFound(false);
      } finally {
        setIsSearchingExcel(false);
      }
    };
    
    performSearch();
  }, [orderNumber, afoNumber, excelDataFound]);

  // Handle Enter key on AFO-Nummer field
  const handleAfoNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('⌨️ Key pressed in AFO field:', e.key, { orderNumber, afoNumber, excelDataFound });
    
    if (e.key === 'Enter' && orderNumber && afoNumber) {
      console.log('🔄 Enter pressed - triggering manual search');
      e.preventDefault();
      setExcelDataFound(null); // Reset to trigger search
    }
  };

  const handleSubmit = useCallback(async () => {
    const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
    if (!selectedEmp) {
      toast.error('Ausgewählter Mitarbeiter nicht gefunden');
      return;
    }

    // Excel-Daten laden, um Ressource zu ermitteln
    const excelData = await getExcelDataByOrderNumber(orderNumber);
    const excelSettings = await getExcelSettings();
    
    let resourceName: string | undefined;
    if (excelData && excelSettings?.resourceColumn && excelData[excelSettings.resourceColumn]) {
      resourceName = excelData[excelSettings.resourceColumn];
    }

    // Teamleiter basierend auf Ressource (priorisiert) oder Abteilung finden
    const teamLeaderId = await findTeamLeaderForResourceOrDepartment(
      resourceName || null,
      selectedDepartment || null
    );

    if (!teamLeaderId) {
      toast.error('Kein Teamleiter für die ausgewählte Ressource/Abteilung gefunden');
      return;
    }

    setShowReview(true);
  }, [employees, selectedDepartment, selectedEmployee, orderNumber]);

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const selectedEmp = employees.find(emp => emp.id === selectedEmployee);

      // Excel-Daten laden basierend auf Auftragsnummer
      const excelData = await getExcelDataByOrderNumber(orderNumber);
      const excelSettings = await getExcelSettings();

      // Zusätzliche Daten extrahieren
      const additionalExcelData: Record<string, any> = {};
      let resourceName: string | undefined;

      if (excelData && excelSettings) {
        // Artikelnummer
        if (excelSettings.articleNumberColumn && excelData[excelSettings.articleNumberColumn]) {
          additionalExcelData.Artikelnummer = excelData[excelSettings.articleNumberColumn];
        }
        
        // Artikelbezeichnung
        if (excelSettings.articleDescriptionColumn && excelData[excelSettings.articleDescriptionColumn]) {
          additionalExcelData.Artikelbezeichnung = excelData[excelSettings.articleDescriptionColumn];
        }
        
        // Ressource
        if (excelSettings.resourceColumn && excelData[excelSettings.resourceColumn]) {
          const resource = excelData[excelSettings.resourceColumn];
          additionalExcelData.Ressource = resource;
          resourceName = resource;
        }
        
        // Zusätzliche konfigurierte Spalten
        if (excelSettings.additionalColumns) {
          excelSettings.additionalColumns.forEach(col => {
            if (excelData[col.column]) {
              additionalExcelData[col.name] = excelData[col.column];
            }
          });
        }
      }

      // Teamleiter basierend auf Ressource (priorisiert) oder Abteilung finden
      const teamLeaderId = await findTeamLeaderForResourceOrDepartment(
        resourceName || null,
        selectedDepartment || null
      );

      if (!teamLeaderId) {
        toast.error('Kein Teamleiter für die ausgewählte Ressource/Abteilung gefunden');
        setIsSubmitting(false);
        return;
      }

      // Teamleiter-Daten laden
      const { data: teamLeaderProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teamLeaderId)
        .single();

      const teamLeaderName = teamLeaderProfile?.username || teamLeaderProfile?.name || 'Unbekannter Teamleiter';

      const report = {
        id: await generateErrorReportId(),
        orderNumber,
        afoNumber: afoNumber || undefined,
        defectiveQuantity: parseInt(defectiveQuantity),
        totalDefectiveQuantity: parseInt(defectiveQuantity),
        creator: selectedEmp!.name,
        personalNumber: selectedEmp!.id,
        machine: machine || undefined,
        problemDescription,
        errorCause: problemDescription,
        correctiveAction,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: teamLeaderName,
        additionalExcelData: Object.keys(additionalExcelData).length > 0 ? additionalExcelData : undefined,
        resourceName: resourceName || undefined,
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };

      await saveErrorReport(report);
      
      setShowReview(false);
      setShowSuccess(true);
      setLastCreatedReport(report);
      
      onReportCreated();
      
      // Success animation
      toast.success('Fehlermeldung erfolgreich erstellt!', {
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Fehler beim Speichern der Fehlermeldung:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewReport = () => {
    setOrderNumber('');
    setAfoNumber('');
    setDefectiveQuantity('');
    setMachine('');
    setProblemDescription('');
    setCorrectiveAction('');
    setSelectedDepartment('');
    setSelectedEmployee('');
    setAudioFiles({});
    setShowSuccess(false);
    setLastCreatedReport(null);
  };

  const handlePrintReport = () => {
    if (lastCreatedReport) {
      printErrorReport(lastCreatedReport);
    }
  };

  const filteredEmployees = selectedDepartment 
    ? employees.filter(emp => emp.departmentId === selectedDepartment)
    : [];

  // Review Screen
  if (showReview) {
    const selectedDept = departments.find(dept => dept.id === selectedDepartment);
    const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
    const selectedMachine = machines.find(m => m.id === machine);

    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="animate-fade-in w-full max-w-4xl px-4">
        <Card className="glass-card border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-700 flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Fehlermeldung überprüfen
            </CardTitle>
            <CardDescription className="text-blue-600 text-lg">
              Bitte überprüfen Sie alle Angaben vor dem endgültigen Erstellen der Fehlermeldung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white/50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Grunddaten
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Ba-Nr.:</span> {orderNumber}</div>
                    <div><span className="font-medium">AFO-Nummer:</span> {afoNumber}</div>
                    <div><span className="font-medium">Menge:</span> {defectiveQuantity}</div>
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Zuordnung
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Abteilung:</span> {selectedDept?.name}</div>
                    <div><span className="font-medium">Ersteller:</span> {selectedEmp?.name}</div>
                    {selectedMachine && <div><span className="font-medium">Feststellort:</span> {selectedMachine.name}</div>}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Beschreibungen
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium">Problembeschreibung:</span>
                      <p className="mt-1 text-gray-700 bg-white/70 p-2 rounded border border-blue-50">
                        {problemDescription}
                      </p>
                    </div>
                    {correctiveAction && (
                      <div>
                        <span className="font-medium">Korrekturmaßnahme:</span>
                        <p className="mt-1 text-gray-700 bg-white/70 p-2 rounded border border-blue-50">
                          {correctiveAction}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button 
                onClick={() => setShowReview(false)} 
                variant="outline"
                className="h-12 border-blue-200 hover:bg-blue-50"
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
              <Button 
                onClick={handleFinalSubmit} 
                className="gradient-button h-12"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Abschicken
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

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="animate-fade-in w-full max-w-4xl px-4">
        <Card className="glass-card border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              Erfolgreich erstellt!
            </CardTitle>
            <CardDescription className="text-green-600 text-lg">
              Ihre Fehlermeldung wurde erfolgreich gespeichert und einem Teamleiter zur Prüfung zugewiesen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                onClick={handleNewReport} 
                className="gradient-button h-12"
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                Neue Fehlermeldung erstellen
              </Button>
              <Button 
                onClick={handlePrintReport} 
                variant="outline" 
                className="h-12 border-green-200 hover:bg-green-50"
                size="lg"
              >
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8">
      <div className="animate-fade-in space-y-8 w-full max-w-4xl px-4">
      {/* Step Indicator */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex flex-col items-center transition-all duration-300 ${
                    isActive ? 'transform scale-110' : ''
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary text-white shadow-lg scale-110' 
                        : isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`font-medium transition-colors duration-300 ${
                        isActive ? 'text-primary text-lg' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className={`text-xs transition-colors duration-300 ${
                        isActive ? 'text-primary/70' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {/* Grunddaten */}
        <Card className={`transition-all duration-300 ${
          currentStep === 1 
            ? 'form-section-active ring-2 ring-primary/20 shadow-lg scale-[1.02] bg-gradient-to-br from-primary/5 to-primary/10' 
            : 'form-section'
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-xl transition-colors duration-300 ${
              currentStep === 1 ? 'text-primary' : ''
            }`}>
              <Package className="h-5 w-5 text-primary" />
              Grunddaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FloatingLabelInput
                ref={orderNumberRef}
                id="orderNumber"
                label="Ba-Nr."
                value={orderNumber}
                onChange={handleOrderNumberChange}
                onClick={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                  }
                  setShowVirtualKeyboard(true);
                  setActiveKeyboardField('orderNumber');
                }}
                onSelect={(e) => {
                  const target = e.target as HTMLInputElement;
                  setCursorPositions(prev => ({ 
                    ...prev, 
                    orderNumber: target.selectionStart || 0
                  }));
                }}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => {
                    setShowVirtualKeyboard(false);
                    setActiveKeyboardField(null);
                  }, 300);
                }}
                placeholder="z.B. 20250"
                required
                icon={<Hash className="h-4 w-4" />}
              />
              <FloatingLabelInput
                ref={afoNumberRef}
                id="afoNumber"
                label="AFO-Nummer"
                value={afoNumber}
                onChange={(value) => {
                  setAfoNumber(value);
                  setExcelDataFound(null); // Reset validation status
                }}
                onKeyDown={handleAfoNumberKeyDown}
                onClick={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                  }
                  setShowVirtualKeyboard(true);
                  setActiveKeyboardField('afoNumber');
                }}
                onSelect={(e) => {
                  const target = e.target as HTMLInputElement;
                  setCursorPositions(prev => ({ 
                    ...prev, 
                    afoNumber: target.selectionStart || 0
                  }));
                }}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => {
                    setShowVirtualKeyboard(false);
                    setActiveKeyboardField(null);
                  }, 300);
                }}
                placeholder="z.B. AFO-12345"
                required
                icon={
                  isSearchingExcel ? <Loader className="h-4 w-4 animate-spin text-blue-500" /> :
                  excelDataFound === true ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                  excelDataFound === false ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                  <Hash className="h-4 w-4" />
                }
              />
            </div>
            
            <FloatingLabelInput
              ref={defectiveQuantityRef}
              id="defectiveQuantity"
              label="Menge"
              type="number"
              value={defectiveQuantity}
              onChange={setDefectiveQuantity}
              onClick={() => {
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                }
                setShowVirtualKeyboard(true);
                setActiveKeyboardField('defectiveQuantity');
              }}
              onSelect={(e) => {
                const target = e.target as HTMLInputElement;
                setCursorPositions(prev => ({ 
                  ...prev, 
                  defectiveQuantity: target.selectionStart || 0
                }));
              }}
              onBlur={() => {
                blurTimeoutRef.current = setTimeout(() => {
                  setShowVirtualKeyboard(false);
                  setActiveKeyboardField(null);
                }, 300);
              }}
              placeholder="Anzahl"
              required
              icon={<Package className="h-4 w-4" />}
            />
          </CardContent>
        </Card>

        {/* Zuordnung */}
        <Card className={`transition-all duration-300 ${
          currentStep === 2 
            ? 'form-section-active ring-2 ring-primary/20 shadow-lg scale-[1.02] bg-gradient-to-br from-primary/5 to-primary/10' 
            : 'form-section'
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-xl transition-colors duration-300 ${
              currentStep === 2 ? 'text-primary' : ''
            }`}>
              <Users className="h-5 w-5 text-primary" />
              Zuordnung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="selectedDepartment" className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Abteilung <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                  <SelectTrigger className="modern-input h-12">
                    <SelectValue placeholder="Abteilung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="selectedEmployee" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Ersteller <span className="text-destructive">*</span>
                </Label>
                <SimpleCombobox
                  options={filteredEmployees.map(emp => ({ value: emp.id, label: emp.name }))}
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="Mitarbeiter auswählen"
                  className="w-full h-12 modern-input"
                  disabled={!selectedDepartment}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine" className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Feststellort
              </Label>
              <SimpleCombobox
                options={machines.map(machine => ({ value: machine.id, label: machine.name }))}
                value={machine}
                onValueChange={setMachine}
                placeholder="Feststellort auswählen"
                className="w-full h-12 modern-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Beschreibung */}
        <Card className={`transition-all duration-300 ${
          currentStep === 3 
            ? 'form-section-active ring-2 ring-primary/20 shadow-lg scale-[1.02] bg-gradient-to-br from-primary/5 to-primary/10' 
            : 'form-section'
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-xl transition-colors duration-300 ${
              currentStep === 3 ? 'text-primary' : ''
            }`}>
              <FileText className="h-5 w-5 text-primary" />
              Beschreibung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingLabelTextarea
                    ref={problemDescriptionRef}
                    id="problemDescription"
                    label="Problembeschreibung"
                    value={problemDescription}
                    onChange={setProblemDescription}
                    onClick={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                      }
                      setShowVirtualKeyboard(true);
                      setActiveKeyboardField('problemDescription');
                    }}
                    onSelect={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      setCursorPositions(prev => ({ 
                        ...prev, 
                        problemDescription: target.selectionStart 
                      }));
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = setTimeout(() => {
                        setShowVirtualKeyboard(false);
                        setActiveKeyboardField(null);
                      }, 300);
                    }}
                    placeholder="Beschreiben Sie das aufgetretene Problem detailliert..."
                    rows={8}
                  />
                </div>
                <AudioRecorderN8n 
                  onTranscription={(transcription, audioBlob) => {
                    setProblemDescription(transcription);
                    setAudioFiles(prev => ({...prev, problemDescription: audioBlob}));
                  }}
                  label="Problembeschreibung aufnehmen"
                  webhookUrl={n8nWebhookUrl}
                  useN8n={true}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingLabelTextarea
                    ref={correctiveActionRef}
                    id="correctiveAction"
                    label="Korrekturmaßnahme"
                    value={correctiveAction}
                    onChange={setCorrectiveAction}
                    onClick={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                      }
                      setShowVirtualKeyboard(true);
                      setActiveKeyboardField('correctiveAction');
                    }}
                    onSelect={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      setCursorPositions(prev => ({ 
                        ...prev, 
                        correctiveAction: target.selectionStart 
                      }));
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = setTimeout(() => {
                        setShowVirtualKeyboard(false);
                        setActiveKeyboardField(null);
                      }, 300);
                    }}
                    placeholder="Beschreiben Sie die durchgeführten Korrekturmaßnahmen..."
                    rows={8}
                  />
                </div>
                <AudioRecorderN8n 
                  onTranscription={(transcription, audioBlob) => {
                    setCorrectiveAction(transcription);
                    setAudioFiles(prev => ({...prev, correctiveAction: audioBlob}));
                  }}
                  label="Korrekturmaßnahme aufnehmen"
                  webhookUrl={n8nWebhookUrl}
                  useN8n={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card className="form-section">
          <CardContent className="pt-6">
            <Button 
              onClick={() => {
                setShowVirtualKeyboard(false);
                setActiveKeyboardField(null);
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                }
                handleSubmit();
              }} 
              className={`w-full h-27 text-3xl font-semibold ${isFormComplete() ? 'gradient-button' : 'bg-muted text-muted-foreground'}`}
              disabled={isSubmitting || !isFormComplete()}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Settings className="h-5 w-5 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : !isFormComplete() ? (
                <>
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Felder ausfüllen
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Zur Übersicht
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Virtual Keyboard */}
      {showVirtualKeyboard && activeKeyboardField && (
        <VirtualKeyboard
          value={
            activeKeyboardField === 'problemDescription' ? problemDescription :
            activeKeyboardField === 'correctiveAction' ? correctiveAction :
            activeKeyboardField === 'orderNumber' ? orderNumber :
            activeKeyboardField === 'afoNumber' ? afoNumber :
            activeKeyboardField === 'defectiveQuantity' ? defectiveQuantity :
            ''
          }
          cursorPosition={cursorPositions[activeKeyboardField]}
          layoutType={
            activeKeyboardField === 'orderNumber' || activeKeyboardField === 'afoNumber' || activeKeyboardField === 'defectiveQuantity' 
              ? 'numeric' 
              : 'default'
          }
          onChange={(value, newCursorPos) => {
            if (activeKeyboardField === 'problemDescription') {
              setProblemDescription(value);
              setCursorPositions(prev => ({ ...prev, problemDescription: newCursorPos }));
              setTimeout(() => {
                if (problemDescriptionRef.current) {
                  problemDescriptionRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  problemDescriptionRef.current.focus();
                }
              }, 0);
            } else if (activeKeyboardField === 'correctiveAction') {
              setCorrectiveAction(value);
              setCursorPositions(prev => ({ ...prev, correctiveAction: newCursorPos }));
              setTimeout(() => {
                if (correctiveActionRef.current) {
                  correctiveActionRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  correctiveActionRef.current.focus();
                }
              }, 0);
            } else if (activeKeyboardField === 'orderNumber') {
              handleOrderNumberChange(value);
              setCursorPositions(prev => ({ ...prev, orderNumber: newCursorPos }));
              setTimeout(() => {
                if (orderNumberRef.current) {
                  orderNumberRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  orderNumberRef.current.focus();
                }
              }, 0);
            } else if (activeKeyboardField === 'afoNumber') {
              setAfoNumber(value);
              setExcelDataFound(null); // Reset validation status
              setCursorPositions(prev => ({ ...prev, afoNumber: newCursorPos }));
              setTimeout(() => {
                if (afoNumberRef.current) {
                  afoNumberRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  afoNumberRef.current.focus();
                }
              }, 0);
            } else if (activeKeyboardField === 'defectiveQuantity') {
              setDefectiveQuantity(value);
              setCursorPositions(prev => ({ ...prev, defectiveQuantity: newCursorPos }));
              setTimeout(() => {
                if (defectiveQuantityRef.current) {
                  defectiveQuantityRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  defectiveQuantityRef.current.focus();
                }
              }, 0);
            }
          }}
          onClose={() => {
            setShowVirtualKeyboard(false);
            setActiveKeyboardField(null);
          }}
         />
      )}
      </div>
    </div>
  );
};

export default ErrorReportFormModern;