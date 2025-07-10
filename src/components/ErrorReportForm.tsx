
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Copy, Eye } from 'lucide-react';
import { saveErrorReport, generateErrorReportId, generateAccessNumber } from '@/lib/storage';
import { getDepartments, getEmployees, Department, Employee } from '@/lib/settingsStorage';
import AudioRecorder from './AudioRecorder';
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
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [audioFiles, setAudioFiles] = useState<{
    problemDescription?: string | null;
    correctiveAction?: string | null;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [accessNumber, setAccessNumber] = useState('');

  useEffect(() => {
    loadDepartmentsData();
    // Generate access number immediately when component mounts
    setAccessNumber(generateAccessNumber());
  }, [refreshDepartments]);

  const loadDepartmentsData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!orderNumber || !defectiveQuantity || 
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
        accessNumber,
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
        audioFiles,
        departmentId: selectedDepartment,
        creatorId: selectedEmployee
      };

      saveErrorReport(report);
      
      // Show success state
      setShowSuccess(true);
      
      onReportCreated();
    } catch (error) {
      console.error('Fehler beim Speichern der Fehlermeldung:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewReport = () => {
    // Reset form and generate new access number
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
    setAccessNumber(generateAccessNumber()); // Generate new access number
  };

  const copyAccessNumber = () => {
    navigator.clipboard.writeText(accessNumber);
    toast.success('Zugriffsnummer kopiert!');
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
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">Ihre Zugriffsnummer:</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-2xl font-mono font-bold text-green-700 bg-white px-3 py-1 rounded border">
                    {accessNumber}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAccessNumber}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-3">
              <strong>Wichtig:</strong> Notieren Sie sich diese 6-stellige Nummer! Mit ihr können Sie später den Status Ihrer Meldung einsehen.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button onClick={handleNewReport} className="flex-1">
              Neue Meldung erstellen
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
        {/* Access Number Display */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Ihre Zugriffsnummer für diese Meldung:</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-mono font-bold text-blue-900 bg-white px-3 py-1 rounded border tracking-widest">
              {accessNumber}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAccessNumber}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-blue-700 mt-2">
            Mit dieser 6-stelligen Nummer können Sie später den Status Ihrer Meldung einsehen.
          </p>
        </div>

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
              <Label htmlFor="afoNumber">AFO-Nummer</Label>
              <Input
                id="afoNumber"
                value={afoNumber}
                onChange={(e) => setAfoNumber(e.target.value)}
                placeholder="z.B. AFO-12345"
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
              <Select 
                value={selectedEmployee} 
                onValueChange={setSelectedEmployee} 
                disabled={!selectedDepartment}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="machine">Maschine/Arbeitsplatz</Label>
            <Input
              id="machine"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="z.B. Maschine 01 - CNC Drehmaschine"
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
