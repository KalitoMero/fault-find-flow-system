import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getDepartments, getEmployees, getMachines, Department, Employee, Machine } from '@/lib/settingsStorage';
import AudioRecorderSimple from './AudioRecorderSimple';
import SearchableCombobox from './SearchableCombobox';
import { printErrorReport } from '@/lib/printUtils';
import { toast } from "sonner";

interface ErrorReportFormModernProps {
  onReportCreated: () => void;
  refreshDepartments: boolean;
}

const FloatingLabelInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder, required, type = "text", icon }) => {
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
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
};

const FloatingLabelTextarea: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}> = ({ id, label, value, onChange, placeholder, required, rows = 3 }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`floating-label-input ${value || isFocused ? 'has-value' : ''}`}>
      <div className="relative">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder=""
          required={required}
          rows={rows}
          className="modern-input pt-4 min-h-[100px] resize-none"
        />
        <Label htmlFor={id} className="floating-label">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      </div>
    </div>
  );
};

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

  useEffect(() => {
    loadDepartmentsData();
  }, [refreshDepartments]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setLastCreatedReport(null);
      }, 120000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadDepartmentsData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
    setMachines(getMachines());
  };

  // Parse AFO from order number if it contains a dot
  const parseOrderNumber = (orderNum: string) => {
    const dotIndex = orderNum.indexOf('.');
    if (dotIndex !== -1) {
      const orderPart = orderNum.substring(0, dotIndex);
      const afoPart = orderNum.substring(dotIndex + 1);
      
      // Only set if AFO number is empty to avoid infinite loop
      if (!afoNumber) {
        setOrderNumber(orderPart);
        setAfoNumber(afoPart);
      }
    }
  };

  // Handle order number change with parsing
  const handleOrderNumberChange = (value: string) => {
    setOrderNumber(value);
    
    // Parse if contains dot and AFO is empty
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1 && !afoNumber) {
      const orderPart = value.substring(0, dotIndex);
      const afoPart = value.substring(dotIndex + 1);
      
      setTimeout(() => {
        setOrderNumber(orderPart);
        setAfoNumber(afoPart);
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!orderNumber || !afoNumber || !defectiveQuantity || 
        !problemDescription || 
        !selectedDepartment || !selectedEmployee) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const departmentEmployees = employees.filter(emp => emp.departmentId === selectedDepartment);
    const teamLeader = departmentEmployees.find(emp => emp.isTeamLeader);
    
    if (!teamLeader) {
      toast.error('Kein Teamleiter für die ausgewählte Abteilung gefunden');
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
    if (!selectedEmp) {
      toast.error('Ausgewählter Mitarbeiter nicht gefunden');
      return;
    }

    // Show review screen instead of directly creating
    setShowReview(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const departmentEmployees = employees.filter(emp => emp.departmentId === selectedDepartment);
      const teamLeader = departmentEmployees.find(emp => emp.isTeamLeader);
      const selectedEmp = employees.find(emp => emp.id === selectedEmployee);

      const report = {
        id: generateErrorReportId(),
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
        assignedTeamLeader: teamLeader!.account?.username || teamLeader!.name,
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };

      saveErrorReport(report);
      
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
      <div className="animate-fade-in">
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
                    <div><span className="font-medium">Auftragsnummer:</span> {orderNumber}</div>
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
    );
  }

  if (showSuccess) {
    return (
      <div className="animate-fade-in">
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
    );
  }

  return (
    <div className="animate-fade-in space-y-8">

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Grunddaten */}
        <Card className="form-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Grunddaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FloatingLabelInput
                id="orderNumber"
                label="Auftragsnummer"
                value={orderNumber}
                onChange={handleOrderNumberChange}
                placeholder="z.B. AUF-2024-001 oder 12345.678"
                required
                icon={<Hash className="h-4 w-4" />}
              />
              <FloatingLabelInput
                id="afoNumber"
                label="AFO-Nummer"
                value={afoNumber}
                onChange={setAfoNumber}
                placeholder="z.B. AFO-12345"
                required
                icon={<Hash className="h-4 w-4" />}
              />
            </div>
            
            <FloatingLabelInput
              id="defectiveQuantity"
              label="Menge"
              type="number"
              value={defectiveQuantity}
              onChange={setDefectiveQuantity}
              placeholder="Anzahl"
              required
              icon={<Package className="h-4 w-4" />}
            />
          </CardContent>
        </Card>

        {/* Zuordnung */}
        <Card className="form-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
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
                <SearchableCombobox
                  options={filteredEmployees.map(emp => ({ value: emp.id, label: emp.name }))}
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="Mitarbeiter auswählen"
                  searchPlaceholder="Mitarbeiter suchen..."
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
              <SearchableCombobox
                options={machines.map(machine => ({ value: machine.id, label: machine.name }))}
                value={machine}
                onValueChange={setMachine}
                placeholder="Feststellort auswählen"
                searchPlaceholder="Feststellort suchen..."
                className="w-full h-12 modern-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Beschreibung */}
        <Card className="form-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Beschreibung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingLabelTextarea
                    id="problemDescription"
                    label="Problembeschreibung"
                    value={problemDescription}
                    onChange={setProblemDescription}
                    placeholder="Beschreiben Sie das aufgetretene Problem detailliert..."
                    rows={4}
                  />
                </div>
                <AudioRecorderSimple 
                  onTranscription={(transcription, audioBlob) => {
                    setProblemDescription(transcription);
                    setAudioFiles(prev => ({...prev, problemDescription: audioBlob}));
                  }}
                  label="Problembeschreibung aufnehmen"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingLabelTextarea
                    id="correctiveAction"
                    label="Korrekturmaßnahme"
                    value={correctiveAction}
                    onChange={setCorrectiveAction}
                    placeholder="Beschreiben Sie die durchgeführten Korrekturmaßnahmen..."
                    rows={4}
                  />
                </div>
                <AudioRecorderSimple 
                  onTranscription={(transcription, audioBlob) => {
                    setCorrectiveAction(transcription);
                    setAudioFiles(prev => ({...prev, correctiveAction: audioBlob}));
                  }}
                  label="Korrekturmaßnahme aufnehmen"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card className="form-section">
          <CardContent className="pt-6">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg gradient-button" 
              disabled={isSubmitting}
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
                  Zur Übersicht
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ErrorReportFormModern;