
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { getDepartments, getEmployees, getMachines, Department, Employee, Machine } from '@/lib/settingsStorage';
import AudioRecorder from './AudioRecorder';
import SearchableCombobox from './SearchableCombobox';
import { printErrorReport } from '@/lib/printUtils';
import { toast } from "sonner";

interface ErrorReportFormProps {
  onReportCreated: () => void;
  refreshDepartments: boolean;
}

const ErrorReportForm: React.FC<ErrorReportFormProps> = ({ onReportCreated, refreshDepartments }) => {
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

  useEffect(() => {
    loadDepartmentsData();
  }, [refreshDepartments]);

  // Auto-hide success message after 2 minutes
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setLastCreatedReport(null);
      }, 120000); // 2 minutes
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadDepartmentsData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
    setMachines(getMachines());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!orderNumber || !afoNumber || !defectiveQuantity || 
          !problemDescription || !correctiveAction || 
          !selectedDepartment || !selectedEmployee) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Find team leader for the selected department
      const departmentEmployees = employees.filter(emp => emp.departmentId === selectedDepartment);
      const teamLeader = departmentEmployees.find(emp => emp.isTeamLeader);
      
      if (!teamLeader) {
        toast.error('Kein Teamleiter für die ausgewählte Abteilung gefunden');
        return;
      }

      // Get selected employee for creator name and personal number
      const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
      if (!selectedEmp) {
        toast.error('Ausgewählter Mitarbeiter nicht gefunden');
        return;
      }

      const report = {
        id: generateErrorReportId(),
        orderNumber,
        afoNumber: afoNumber || undefined,
        defectiveQuantity: parseInt(defectiveQuantity),
        totalDefectiveQuantity: parseInt(defectiveQuantity), // Use same as defective quantity
        creator: selectedEmp.name,
        personalNumber: selectedEmp.id, // Use employee ID as personal number
        machine: machine || undefined,
        problemDescription,
        errorCause: problemDescription, // Use problem description as error cause
        correctiveAction,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: teamLeader.account?.username || teamLeader.name,
        audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : undefined
      };

      saveErrorReport(report);
      
      // Show success state and store created report
      setShowSuccess(true);
      setLastCreatedReport(report);
      
      onReportCreated();
    } catch (error) {
      console.error('Fehler beim Speichern der Fehlermeldung:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewReport = () => {
    // Reset form
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

  if (showSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Fehlermeldung erfolgreich erstellt!</span>
          </CardTitle>
          <CardDescription>
            Ihre Fehlermeldung wurde erfolgreich gespeichert und einem Teamleiter zur Prüfung zugewiesen.
            Dieses Fenster schließt sich automatisch in 2 Minuten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-3">
            <Button onClick={handleNewReport} className="flex-1">
              Neue Fehlermeldung erstellen
            </Button>
            <Button onClick={handlePrintReport} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>Neue Fehlermeldung erstellen</span>
        </CardTitle>
        <CardDescription>
          Erfassen Sie eine neue Fehlermeldung für die Qualitätssicherung
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">Auftragsnummer *</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="z.B. AUF-2024-001"
                required
              />
            </div>
            <div>
              <Label htmlFor="afoNumber">AFO-Nummer *</Label>
              <Input
                id="afoNumber"
                value={afoNumber}
                onChange={(e) => setAfoNumber(e.target.value)}
                placeholder="z.B. AFO-12345"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="defectiveQuantity">Fehlerhafte Menge *</Label>
            <Input
              id="defectiveQuantity"
              type="number"
              value={defectiveQuantity}
              onChange={(e) => setDefectiveQuantity(e.target.value)}
              placeholder="Anzahl fehlerhafter Teile"
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="selectedDepartment">Abteilung *</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                <SelectTrigger>
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
            <div>
              <Label htmlFor="selectedEmployee">Ersteller *</Label>
              <SearchableCombobox
                options={filteredEmployees.map(emp => ({ value: emp.id, label: emp.name }))}
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
                placeholder="Mitarbeiter auswählen"
                searchPlaceholder="Mitarbeiter suchen..."
                className="w-full"
                disabled={!selectedDepartment}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="machine">Feststellort</Label>
            <SearchableCombobox
              options={machines.map(machine => ({ value: machine.id, label: machine.name }))}
              value={machine}
              onValueChange={setMachine}
              placeholder="Feststellort auswählen"
              searchPlaceholder="Feststellort suchen..."
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="problemDescription">Problembeschreibung *</Label>
            <Textarea
              id="problemDescription"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Beschreiben Sie das aufgetretene Problem detailliert..."
              rows={3}
              required
            />
            <AudioRecorder 
              onTranscription={(transcription, audioBlob) => {
                setProblemDescription(transcription);
                setAudioFiles(prev => ({...prev, problemDescription: audioBlob}));
              }}
              label="Problembeschreibung aufnehmen"
            />
          </div>

          <div>
            <Label htmlFor="correctiveAction">Korrekturmaßnahme *</Label>
            <Textarea
              id="correctiveAction"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Beschreiben Sie die durchgeführten Korrekturmaßnahmen..."
              rows={3}
              required
            />
            <AudioRecorder 
              onTranscription={(transcription, audioBlob) => {
                setCorrectiveAction(transcription);
                setAudioFiles(prev => ({...prev, correctiveAction: audioBlob}));
              }}
              label="Korrekturmaßnahme aufnehmen"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Wird gespeichert...' : 'Fehlermeldung erstellen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ErrorReportForm;
