import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowRight, Edit3, Package, Hash, User, FileText, Settings, Home, Trash2, Printer, Delete } from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getEmployees, Employee, getDepartments } from '@/lib/settingsStorage';
import { getExcelSettings } from '@/lib/excelStorage';
import { printErrorReport } from '@/lib/printUtils';
import { generatePDF } from '@/lib/pdfUtils';
import AudioRecorderSimple from './AudioRecorderSimple';
import AudioRecorderN8n from './AudioRecorderN8n';
import TouchKeypad from './TouchKeypad';
import VirtualKeyboard from './VirtualKeyboard';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface StepByStepFormProps {
  onReportCreated: () => void;
  onClose: () => void;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'quantity';
  required: boolean;
  completed: boolean;
  icon: React.ReactNode;
  placeholder: string;
  options?: { value: string; label: string }[];
  quantityType?: string; // For storing the selected quantity type
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
  const [excelDepartmentName, setExcelDepartmentName] = useState<string>('');
  const [assignedTeamLeader, setAssignedTeamLeader] = useState<string>('System');
  const [additionalExcelData, setAdditionalExcelData] = useState<Record<string, any>>({});
  const [showReview, setShowReview] = useState(false);
  const [excelDataFound, setExcelDataFound] = useState<boolean | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedCombination, setLastSearchedCombination] = useState<string>('');
  
  // N8N Settings State - Always enabled
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  
  // Virtual Keyboard State
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [activeKeyboardField, setActiveKeyboardField] = useState<string | null>(null);
  const blurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Ref for textarea to track cursor position
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Helper function to get team leader display name
  const getTeamLeaderDisplayName = (teamLeaderId: string): string => {
    const employee = employees.find(emp => emp.id === teamLeaderId);
    return employee ? employee.name : teamLeaderId;
  };

  const [fields, setFields] = useState<FormField[]>([
    {
      id: 'orderNumber',
      label: 'Ba-Nr.',
      value: '',
      type: 'text',
      required: true,
      completed: false,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. 20250'
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
      label: 'Ausschussmenge',
      value: '',
      type: 'quantity',
      required: true,
      completed: false,
      icon: <Package className="h-4 w-4" />,
      placeholder: 'Anzahl eingeben',
      options: [
        { value: 'Ausschussmenge', label: 'Ausschussmenge' },
        { value: 'Nacharbeit', label: 'Nacharbeit' }
      ],
      quantityType: 'Ausschussmenge'
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

  // Load global N8N settings on component mount
  const loadN8nSettings = useCallback(async () => {
    try {
      const { data: settings } = await supabase
        .from('n8n_settings')
        .select('webhook_url, is_enabled')
        .is('user_id', null)
        .maybeSingle();
      
      const url = settings?.webhook_url || '';
      setN8nWebhookUrl(url);
      console.log('✅ StepByStepForm - Global N8N integration ACTIVATED, URL loaded:', url);
    } catch (error) {
      console.error('❌ StepByStepForm - Error loading N8N settings:', error);
    }
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      const emps = await getEmployees();
      setEmployees(emps);
    };
    loadEmployees();
    loadN8nSettings();
    
    // Listen for N8N settings changes
    const handleN8nSettingsUpdate = () => {
      console.log('📡 StepByStepForm - N8N settings update event received');
      loadN8nSettings();
    };

    window.addEventListener('n8n-settings-updated', handleN8nSettingsUpdate);

    return () => {
      window.removeEventListener('n8n-settings-updated', handleN8nSettingsUpdate);
    };
  }, [loadN8nSettings]);

  // Removed automatic Excel check on AFO change - now only on order number parsing

  // Auto-detect barcode scan with dot separator in order number field
  useEffect(() => {
    const orderField = fields[0]; // BA-Nummer ist immer Feld 0
    
    // Nur wenn wir auf Schritt 0 sind und ein Punkt im Wert ist
    if (currentStep === 0 && orderField?.value?.includes('.')) {
      console.log('🔍 Barcode mit Punkt erkannt:', orderField.value);
      
      // Kleine Verzögerung (debounce), damit der Scanner fertig ist
      const timer = setTimeout(async () => {
        const value = orderField.value;
        const dotIndex = value.indexOf('.');
        const orderPart = value.substring(0, dotIndex).trim();
        const afoPart = value.substring(dotIndex + 1).trim();
        
        // Nur verarbeiten, wenn beide Teile vorhanden sind und noch nicht gesucht wurde
        const currentCombination = `${orderPart}-${afoPart}`;
        if (orderPart && afoPart && currentCombination !== lastSearchedCombination) {
          console.log('📊 Teile Barcode auf:', { orderPart, afoPart });
          toast.info('🔍 Barcode wird verarbeitet...');
          
          // Update fields immediately
          setFields(prev => prev.map(field => {
            if (field.id === 'orderNumber') {
              return { ...field, value: orderPart, completed: true };
            }
            if (field.id === 'afoNumber') {
              return { ...field, value: afoPart, completed: true };
            }
            return field;
          }));
          
          // Starte Excel-Suche
          const foundWithDepartment = await checkExcelData(orderPart, afoPart);
          
          // Springe zum nächsten relevanten Feld
          if (foundWithDepartment) {
            console.log('✅ Abteilung gefunden, springe zu Personalnummer (Schritt 2)');
            toast.success(`✅ Auftrag gefunden! Abteilung: ${excelDepartmentName || 'Unbekannt'}`);
            setCurrentStep(2); // Personalnummer
          } else {
            console.log('⚠️ Keine Abteilung gefunden in Excel-Daten');
            toast.warning('⚠️ Auftrag nicht in Excel-Daten gefunden');
            setCurrentStep(1); // AFO-Nummer zur manuellen Korrektur
          }
        }
      }, 300); // 300ms Verzögerung nach letzter Eingabe
      
      return () => clearTimeout(timer);
    }
  }, [fields, currentStep, lastSearchedCombination, excelDepartmentName]);

  // Auto-focus input field when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentField = fields[currentStep];
      if (!currentField) return;
      
      // Focus on textarea for text fields
      if (currentField.type === 'textarea') {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      } 
      // Focus on input for text and quantity fields
      else if (currentField.type === 'text' || currentField.type === 'quantity') {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [currentStep, fields]);

  // Finde den passenden Teamleiter basierend auf der Abteilungs-ID
  const findTeamLeaderForDepartment = async (departmentId: string): Promise<string> => {
    try {
      const employees = await getEmployees();
      
      // Finde Teamleiter in dieser Abteilung
      const teamLeader = employees.find(emp => 
        emp.isTeamLeader && 
        emp.departmentId === departmentId && 
        emp.id
      );
      
      if (teamLeader && teamLeader.id) {
        console.log('Team leader found for department ID', departmentId, ':', teamLeader.id);
        return teamLeader.id;
      }
      
      console.log('No team leader found for department ID:', departmentId);
      return 'System';
    } catch (error) {
      // If access is denied (e.g., team leader trying to access admin function), return System
      if (error instanceof Error && error.message.includes('Forbidden')) {
        console.log('Access denied to employee list, using System as default');
        return 'System';
      }
      throw error;
    }
  };

  // Removed parseOrderNumber - logic moved to handleNext

  // Check Excel data using server-side search - returns true if data found with department
  const checkExcelData = async (orderNumber: string, afoNumber?: string): Promise<boolean> => {
    if (!afoNumber) {
      console.log('No AFO number provided, skipping Excel check');
      setIsSearching(false);
      return false;
    }

    console.log('🔍 Searching Excel database for:', { orderNumber, afoNumber });
    setIsSearching(true);
    const startTime = performance.now();
    
    try {
      // Get Excel settings first
      const settings = await getExcelSettings();
      if (!settings) {
        console.log('⚠️ No Excel settings found');
        setExcelDataFound(false);
        setExcelDepartment('');
        setExcelDepartmentName('');
        setAssignedTeamLeader('System');
        setAdditionalExcelData({});
        setIsSearching(false);
        return false;
      }

      // Call server-side search function  
      const { data: result, error } = await supabase.rpc('search_excel_row', {
        p_order_number: orderNumber,
        p_afo_number: afoNumber,
        p_order_column: settings.orderNumberColumn,  // Now contains column name like "bab_nr"
        p_afo_column: settings.afoNumberColumn,      // Now contains column name like "afo_nr"
        p_article_column: settings.articleNumberColumn || null,
        p_article_desc_column: settings.articleDescriptionColumn || null,
        p_department_column: settings.departmentColumn || null,
        p_additional_columns: JSON.parse(JSON.stringify(settings.additionalColumns || []))
      });
      
      console.log('🔍 RPC search params:', {
        order_col: settings.orderNumberColumn,
        afo_col: settings.afoNumberColumn,
        order_val: orderNumber,
        afo_val: afoNumber
      });

      if (error) {
        console.error('❌ Excel search error:', error);
        setIsSearching(false);
        return false;
      }
      
      const searchTime = Math.round(performance.now() - startTime);
      console.log(`⚡ Excel search completed in ${searchTime}ms`);
      
      let foundWithDepartment = false;
      
      if (result) {
        console.log('✅ Match found:', result);
        setExcelDataFound(true);
        
        // Type the result properly
        const typedResult = result as unknown as {
          row: Record<string, any>;
          additionalData: Record<string, any>;
          department?: string;
        };
        
        // Set additional Excel data
        setAdditionalExcelData(typedResult.additionalData || {});
        
        // Auto-fill department if available
        if (typedResult.department) {
          console.log('📊 Department code from Excel:', typedResult.department);
          
          const departments = await getDepartments();
          console.log('📊 Departments loaded:', {
            count: departments.length,
            departments: departments.map(d => ({ id: d.id, name: d.name, code: d.code }))
          });

          if (departments.length === 0) {
            console.error('⚠️ WARNUNG: Keine Departments gefunden! Mögliches RLS- oder Datenbankproblem.');
            toast.error('Keine Abteilungen verfügbar. Bitte laden Sie die Seite neu (Strg+Shift+R).');
            setIsSearching(false);
            return false;
          }
          
          // Search by code (from Excel) with case-insensitive and trim comparison
          const deptCode = typedResult.department?.toString().trim().toUpperCase();
          const department = departments.find(d => 
            d.code?.trim().toUpperCase() === deptCode || 
            d.name?.trim().toUpperCase() === deptCode
          );
          
          if (department) {
            setExcelDepartment(department.id);
            setExcelDepartmentName(department.name);
            console.log('✅ Department matched:', department.name, 'with ID:', department.id);
            foundWithDepartment = true;
            
            // Find and set team leader using department ID
            const teamLeader = await findTeamLeaderForDepartment(department.id);
            setAssignedTeamLeader(teamLeader);
            console.log('Assigned team leader:', teamLeader);
            
            // Track this successful search combination
            setLastSearchedCombination(`${orderNumber}-${afoNumber}`);
          } else {
            setExcelDepartment('');
            setExcelDepartmentName('');
            console.log('❌ No matching department found for code/name:', typedResult.department, 'Available codes:', departments.map(d => d.code));
          }
        } else {
          console.log('No department found in Excel data');
          setExcelDepartment('');
          setExcelDepartmentName('');
          setAssignedTeamLeader('System');
        }
      } else {
        console.log('❌ No matching row found');
        setExcelDataFound(false);
        setExcelDepartment('');
        setExcelDepartmentName('');
        setAssignedTeamLeader('System');
        setAdditionalExcelData({});
      }
      
      setIsSearching(false);
      return foundWithDepartment;
    } catch (error) {
      console.error('❌ Excel search exception:', error);
      setExcelDataFound(false);
      setExcelDepartment('');
      setExcelDepartmentName('');
      setAssignedTeamLeader('System');
      setAdditionalExcelData({});
      setIsSearching(false);
      return false;
    }
  };

  // Performance optimized form validation
  const isFormComplete = useCallback(() => {
    const requiredFields = fields.filter(f => f.required);
    return requiredFields.every(f => f.value.trim().length > 0);
  }, [fields]);

  const handleQuantityTypeUpdate = useCallback((fieldId: string, quantityType: string) => {
    setFields(prev => prev.map(field => {
      if (field.id === fieldId) {
        return { ...field, quantityType };
      }
      return field;
    }));
  }, []);

  const handleFieldUpdate = useCallback((fieldId: string, value: string) => {
    console.log('handleFieldUpdate called:', fieldId, value);
    
    // Reset Excel search tracking when order or AFO number changes
    if (fieldId === 'orderNumber' || fieldId === 'afoNumber') {
      setLastSearchedCombination('');
      setExcelDataFound(null);
    }
    
    setFields(prev => prev.map(field => {
      if (field.id === fieldId) {
        // For quantity fields, allow empty string
        const updated = { 
          ...field, 
          value, 
          completed: field.type === 'quantity' ? value.length > 0 : value.length > 0 
        };
        return updated;
      }
      return field;
    }));
    // Excel check is now only done on order number parsing with "."
  }, []);

  const handleNext = async () => {
    const currentField = fields[currentStep];
    if (currentField.required && !currentField.value) {
      toast.error(`${currentField.label} ist ein Pflichtfeld`);
      return;
    }

    // Parse order number when leaving the order number field (step 0)
    if (currentStep === 0 && currentField.value.includes('.')) {
      console.log('Parsing order number:', currentField.value);
      const dotIndex = currentField.value.indexOf('.');
      const orderPart = currentField.value.substring(0, dotIndex);
      const afoPart = currentField.value.substring(dotIndex + 1);
      
      // Update fields immediately
      setFields(prev => prev.map(field => {
        if (field.id === 'orderNumber') {
          return { ...field, value: orderPart, completed: true };
        }
        if (field.id === 'afoNumber') {
          return { ...field, value: afoPart, completed: true };
        }
        return field;
      }));
      
      // Wait for Excel search to complete and get result
      const foundWithDepartment = await checkExcelData(orderPart, afoPart);
      
      // Track this search combination
      setLastSearchedCombination(`${orderPart}-${afoPart}`);
      
      // Decide where to go based on the result
      if (foundWithDepartment) {
        // Data found and department set - skip to step 2 (defectiveQuantity)
        console.log('✅ Excel data found with department, skipping to defectiveQuantity');
        setCurrentStep(2);
      } else {
        // Data not found or no department - go to AFO step for manual department selection
        console.log('⚠️ Excel data not found or no department, going to AFO step for department selection');
        setCurrentStep(1);
      }
      return;
    }

    // After AFO field (step 1), trigger Excel search for separate inputs
    if (currentStep === 1) {
      const orderField = fields.find(f => f.id === 'orderNumber');
      const afoField = fields.find(f => f.id === 'afoNumber');
      
      // Check if this is a new combination that needs to be searched
      const currentCombination = `${orderField?.value}-${afoField?.value}`;
      if (orderField?.value && afoField?.value && lastSearchedCombination !== currentCombination) {
        console.log('Triggering Excel search for separate inputs:', orderField.value, afoField.value);
        
        // Perform Excel search
        const foundWithDepartment = await checkExcelData(orderField.value, afoField.value);
        
        // Track this search combination (set in checkExcelData if successful)
        if (!foundWithDepartment) {
          // Also track unsuccessful searches to prevent re-searching
          setLastSearchedCombination(currentCombination);
        }
        
        // Mark fields as completed
        setFields(prev => prev.map((field, index) => 
          index === currentStep ? { ...field, completed: true } : field
        ));
        
        // Navigate based on result
        if (foundWithDepartment) {
          console.log('✅ Excel data found with department, jumping to defectiveQuantity');
          setCurrentStep(2);
        } else {
          console.log('⚠️ No department found in Excel data');
          toast.error('Keine Abteilungsinformationen gefunden. Bitte stellen Sie sicher, dass die Excel-Daten korrekt sind.');
          setCurrentStep(2); // Continue anyway
        }
        return;
      }
      
      // If Excel search was already done (by dot method), just show warning if no department
      if (excelDataFound === false || !excelDepartment) {
        toast.error('Keine Abteilungsinformationen gefunden. Bitte stellen Sie sicher, dass die Excel-Daten korrekt sind.');
      }
    }

    setFields(prev => prev.map((field, index) => 
      index === currentStep ? { ...field, completed: true } : field
    ));

    // Return to original step or go to next step
    if (originalStep > currentStep && originalStep < fields.length) {
      setCurrentStep(originalStep);
      setOriginalStep(0);
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
    const newValue = currentField.value.slice(0, -1);
    console.log('Keypad Backspace - Current:', currentField.value, 'New:', newValue);
    handleFieldUpdate(currentField.id, newValue);
  };

  const handleSubmitAndPrint = useCallback(async () => {
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
      const reportId = await generateErrorReportId();
      const problemDesc = fields.find(f => f.id === 'problemDescription')?.value || '';
      const correctiveAct = fields.find(f => f.id === 'correctiveAction')?.value || '';
      const personalNum = fields.find(f => f.id === 'personalNumber')?.value || '';
      
      // Validate that personal number meets requirements (min 2 characters as per RLS policy)
      if (!personalNum.trim() || personalNum.trim().length < 2) {
        toast.error('Personalnummer muss mindestens 2 Zeichen haben');
        setIsSubmitting(false);
        return;
      }
      
      const report = {
        id: reportId,
        orderNumber: fields.find(f => f.id === 'orderNumber')?.value || '',
        afoNumber: fields.find(f => f.id === 'afoNumber')?.value || '',
        personalNumber: personalNum,
        defectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        totalDefectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        quantityType: fields.find(f => f.id === 'defectiveQuantity')?.quantityType || 'Ausschussmenge',
        problemDescription: problemDesc,
        errorCause: problemDesc,
        correctiveAction: correctiveAct,
        machine: undefined,
        creator: personalNum,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader,
        excelDepartment,
        additionalExcelData: Object.keys(additionalExcelData).length > 0 ? additionalExcelData : undefined,
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };
      
      console.log('Saving report:', report);
      await saveErrorReport(report);
      
      // PDF automatisch generieren und herunterladen
      generatePDF(report);
      
      onReportCreated();
      onClose();
      
      toast.success('Fehlermeldung erstellt und PDF wird heruntergeladen!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern der Fehlermeldung';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [fields, isFormComplete, showReview, assignedTeamLeader, excelDepartment, additionalExcelData, audioFiles, onReportCreated, onClose]);

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
      const problemDesc = fields.find(f => f.id === 'problemDescription')?.value || '';
      const correctiveAct = fields.find(f => f.id === 'correctiveAction')?.value || '';
      
      // Validate problem description length (minimum 10 characters as per RLS policy)
      if (problemDesc.trim().length < 10) {
        toast.error('Problembeschreibung muss mindestens 10 Zeichen lang sein');
        setIsSubmitting(false);
        return;
      }
      
      const personalNum = fields.find(f => f.id === 'personalNumber')?.value || '';
      
      // Validate that personal number meets requirements (min 2 characters as per RLS policy)
      if (!personalNum.trim() || personalNum.trim().length < 2) {
        toast.error('Personalnummer muss mindestens 2 Zeichen haben');
        setIsSubmitting(false);
        return;
      }
      
      const report = {
        id: await generateErrorReportId(),
        orderNumber: fields.find(f => f.id === 'orderNumber')?.value || '',
        afoNumber: fields.find(f => f.id === 'afoNumber')?.value || '',
        defectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        totalDefectiveQuantity: parseInt(fields.find(f => f.id === 'defectiveQuantity')?.value || '0'),
        quantityType: fields.find(f => f.id === 'defectiveQuantity')?.quantityType || 'Ausschussmenge',
        creator: personalNum,
        personalNumber: personalNum,
        machine: undefined,
        detectionLocation: fields.find(f => f.id === 'detectionLocation')?.value || undefined,
        problemDescription: problemDesc,
        errorCause: problemDesc, // Use same as problem description for now
        correctiveAction: correctiveAct || '', // Leave empty if not provided
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: assignedTeamLeader,
        excelDepartment: excelDepartment || undefined,
        additionalExcelData: Object.keys(additionalExcelData).length > 0 ? additionalExcelData : undefined,
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };

      await saveErrorReport(report);
      
      toast.success('Fehlermeldung erfolgreich erstellt!');
      
      // Automatisch Druckdialog öffnen mit automatischer Rückkehr zur Startseite
      await printErrorReport(report, () => {
        onReportCreated(); // Navigiert automatisch zur Startseite
        onClose(); // Schließt das Formular
      });
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern der Fehlermeldung';
      toast.error(errorMessage);
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

        <div className="mx-auto space-y-6 pt-16">
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
                      <span className="font-medium text-gray-700">
                        {field.type === 'quantity' ? (field.quantityType || 'Ausschussmenge') : field.label}
                      </span>
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
              {(excelDepartmentName || Object.keys(additionalExcelData).length > 0) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Excel-Daten
                  </h4>
                  <div className="space-y-1 text-sm">
                    {excelDepartmentName && (
                      <div>
                        <span className="text-blue-600">Abteilung:</span> {excelDepartmentName}
                      </div>
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

              <div className="flex justify-center gap-3 pt-6">
                <Button 
                  onClick={() => setShowReview(false)}
                  variant="outline"
                  size="lg"
                  className="px-6 py-3"
                >
                  Bearbeiten
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Settings className="h-5 w-5 mr-2 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <Printer className="h-5 w-5 mr-2" />
                      Fertigstellen & Drucken
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
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>


      <div className="max-w-6xl mx-auto space-y-4">

        {/* All Fields Overview */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Excel Status Info */}
              {(excelDepartment || Object.keys(additionalExcelData).length > 0) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center text-sm flex-wrap gap-2">
                    {excelDepartmentName && (
                      <div>
                        <span className="text-blue-600">Abteilung:</span> <span className="font-medium">
                          {excelDepartmentName}
                        </span>
                      </div>
                    )}
                    {assignedTeamLeader !== 'System' && (
                      <div>
                        <span className="text-blue-600">Teamleiter:</span> <span className="font-medium">{getTeamLeaderDisplayName(assignedTeamLeader)}</span>
                      </div>
                    )}
                    {additionalExcelData.Artikelnummer && (
                      <div>
                        <span className="text-blue-600">Artikelnummer:</span> <span className="font-medium">{additionalExcelData.Artikelnummer}</span>
                      </div>
                    )}
                    {additionalExcelData.Artikelbezeichnung && (
                      <div>
                        <span className="text-blue-600">Artikelbezeichnung:</span> <span className="font-medium">{additionalExcelData.Artikelbezeichnung}</span>
                      </div>
                    )}
                    {Object.entries(additionalExcelData).filter(([key]) => key !== 'Artikelnummer' && key !== 'Artikelbezeichnung').map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}:</span> <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Number fields in a row - 4 columns */}
              <div className="grid grid-cols-4 gap-3">
                {fields.filter(f => f.type !== 'textarea').map((field, index) => {
                  const isCurrentField = index === currentStep;
                  const isCompleted = field.completed;
                  const isEmpty = !field.value;
                  
                  return (
                    <div
                      key={field.id}
                      onClick={() => isCompleted ? handleFieldClick(index) : undefined}
                      className={`
                        flex items-center gap-2 rounded-lg transition-all duration-300 ${
                          isCurrentField 
                            ? 'p-4 bg-blue-100 border-2 border-blue-400 shadow-lg scale-105 cursor-default' 
                            : isCompleted
                            ? 'p-2 bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100'
                            : 'p-2 bg-gray-50 border border-gray-200'
                        }
                      `}
                    >
                      <div className={`${isCurrentField ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                        {field.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${
                          isCurrentField ? 'text-blue-800' : isCompleted ? 'text-green-800' : 'text-gray-500'
                        }`}>
                          {field.type === 'quantity' ? (field.quantityType || 'Ausschussmenge') : field.label}
                        </p>
                        <p className={`text-sm truncate ${
                          isCurrentField ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {field.value || (isEmpty ? 'Nicht ausgefüllt' : field.value)}
                        </p>
                      </div>
                      {isCompleted && !isCurrentField && (
                        <Edit3 className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Text areas in two columns */}
              <div className="grid grid-cols-2 gap-3">
                {fields.filter(f => f.type === 'textarea').map((field, index) => {
                  const fieldIndex = fields.findIndex(f => f.id === field.id);
                  const isCurrentField = fieldIndex === currentStep;
                  const isCompleted = field.completed;
                  const isEmpty = !field.value;
                  
                  return (
                    <div
                      key={field.id}
                      onClick={() => isCompleted ? handleFieldClick(fieldIndex) : undefined}
                      className={`
                        flex items-start gap-3 rounded-lg transition-all duration-300 ${
                          isCurrentField 
                            ? 'p-4 bg-blue-100 border-2 border-blue-400 shadow-lg scale-[1.02] cursor-default' 
                            : isCompleted
                            ? 'p-3 bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100'
                            : 'p-3 bg-gray-50 border border-gray-200'
                        }
                      `}
                    >
                      <div className={`${isCurrentField ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                        {field.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          isCurrentField ? 'text-blue-800' : isCompleted ? 'text-green-800' : 'text-gray-500'
                        }`}>
                          {field.label}
                        </p>
                        <div className={`text-sm ${
                          isCurrentField ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {field.value ? (
                            <p className="truncate">{field.value}</p>
                          ) : (
                            <p>Nicht ausgefüllt</p>
                          )}
                        </div>
                      </div>
                      {isCompleted && !isCurrentField && (
                        <Edit3 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Field */}
        <Card className="bg-white shadow-xl min-h-[600px] flex flex-col justify-center">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl flex items-center justify-center gap-3">
              {currentField.icon}
              {currentField.type === 'quantity' ? (currentField.quantityType || 'Ausschussmenge') : currentField.label}
              {currentField.required && <span className="text-red-500">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center space-y-4">
              {currentField.type === 'textarea' ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="flex gap-2 items-start">
                    <Textarea
                      ref={textareaRef}
                      value={currentField.value}
                      onChange={(e) => handleFieldUpdate(currentField.id, e.target.value)}
                      onClick={() => {
                        if (blurTimeoutRef.current) {
                          clearTimeout(blurTimeoutRef.current);
                        }
                        setShowVirtualKeyboard(true);
                        setActiveKeyboardField(currentField.id);
                      }}
                      onBlur={() => {
                        blurTimeoutRef.current = setTimeout(() => {
                          setShowVirtualKeyboard(false);
                          setActiveKeyboardField(null);
                        }, 300);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && currentField.value.trim()) {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      placeholder={currentField.placeholder}
                      rows={8}
                      className="text-center text-lg flex-1"
                      disabled={isSearching && currentStep === 0}
                    />
                    {(currentField.id === 'problemDescription' || currentField.id === 'correctiveAction') && (
                      <div className="flex flex-col gap-0.5 self-start -mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => {
                            const textarea = textareaRef.current;
                            if (!textarea) return;
                            
                            const currentValue = currentField.value;
                            const cursorPos = textarea.selectionStart;
                            
                            if (cursorPos > 0) {
                              // Zeichen vor dem Cursor löschen
                              const newValue = currentValue.slice(0, cursorPos - 1) + currentValue.slice(cursorPos);
                              handleFieldUpdate(currentField.id, newValue);
                              
                              // Cursor-Position wiederherstellen (eine Position zurück)
                              setTimeout(() => {
                                textarea.focus();
                                textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
                              }, 0);
                            }
                          }}
                          className="h-10 px-4"
                          title="Letztes Zeichen löschen"
                        >
                          <Delete className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => handleFieldUpdate(currentField.id, '')}
                          className="h-10 px-4"
                          title="Text löschen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                        <div className="mt-1">
                          <AudioRecorderN8n
                            key={currentField.id}
                            onTranscription={(transcription, audioBlob) => {
                              handleFieldUpdate(currentField.id, transcription);
                              if (audioBlob) {
                                setAudioFiles(prev => ({...prev, [currentField.id]: audioBlob}));
                              }
                            }}
                            label={`${currentField.label} aufnehmen`}
                            webhookUrl={n8nWebhookUrl}
                            useN8n={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentField.type === 'select' ? (
                <div className="flex flex-col items-center space-y-4">
                  <Select 
                    value={currentField.value} 
                    onValueChange={(value) => handleFieldUpdate(currentField.id, value)}
                  >
                    <SelectTrigger className="text-center text-xl max-w-md h-14">
                      <SelectValue placeholder={currentField.placeholder} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {currentField.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : currentField.type === 'quantity' ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* Dropdown for quantity type */}
                  <Select 
                    value={currentField.quantityType || 'Ausschussmenge'} 
                    onValueChange={(value) => handleQuantityTypeUpdate(currentField.id, value)}
                  >
                    <SelectTrigger className="text-center text-lg max-w-md h-12 bg-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {currentField.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Input field for quantity */}
                  <Input
                    type="text"
                    value={currentField.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Quantity onChange:', value);
                      // Allow empty string or numbers only
                      if (value === '' || /^[0-9]+$/.test(value)) {
                        handleFieldUpdate(currentField.id, value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentField.value.trim()) {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    placeholder={currentField.placeholder || ""}
                    className="text-center text-xl max-w-md h-14"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isSearching && currentStep === 0}
                  />
                  
                  {/* Touch Keypad for quantity input */}
                  <div className="w-full max-w-xs">
                    <TouchKeypad
                      onInput={handleKeypadInput}
                      onBackspace={handleKeypadBackspace}
                      allowDecimal={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Input
                    type="text"
                    value={currentField.value}
                    onChange={(e) => handleFieldUpdate(currentField.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentField.value.trim()) {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    placeholder={currentField.placeholder}
                    className="text-center text-xl max-w-md h-14"
                    pattern={currentField.id === 'orderNumber' ? '[0-9.]*' : '[0-9]*'}
                    disabled={isSearching && currentStep === 0}
                    inputMode={currentField.id === 'orderNumber' ? 'decimal' : 'numeric'}
                  />
                  
                  {/* Touch Keypad - Always visible for non-textarea fields */}
                  <TouchKeypad
                    onInput={handleKeypadInput}
                    onBackspace={handleKeypadBackspace}
                    allowDecimal={currentField.id === 'orderNumber'}
                    className="mt-4"
                  />
                </div>
              )}
            </div>


            <div className="flex justify-center gap-4 pt-6">
              {isLastStep ? (
                <Button 
                  onClick={() => {
                    setShowVirtualKeyboard(false);
                    setActiveKeyboardField(null);
                    if (blurTimeoutRef.current) {
                      clearTimeout(blurTimeoutRef.current);
                    }
                    handleSubmit();
                  }}
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
                      {isFormComplete() ? 'Fertigstellen' : 'Alle Pflichtfelder ausfüllen'}
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setShowVirtualKeyboard(false);
                    setActiveKeyboardField(null);
                    if (blurTimeoutRef.current) {
                      clearTimeout(blurTimeoutRef.current);
                    }
                    handleNext();
                  }}
                  className="px-8 py-3 text-lg"
                  size="lg"
                  disabled={isSearching}
                >
                  {isSearching ? 'Suche läuft...' : 'Weiter'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Virtual Keyboard */}
      {showVirtualKeyboard && activeKeyboardField && (
        <VirtualKeyboard
          value={fields.find(f => f.id === activeKeyboardField)?.value || ''}
          onChange={(value) => handleFieldUpdate(activeKeyboardField, value)}
          onClose={() => {
            setShowVirtualKeyboard(false);
            setActiveKeyboardField(null);
          }}
        />
      )}
    </div>
  );
};

export default StepByStepForm;