import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from 'lucide-react';
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
  const [totalDefectiveQuantity, setTotalDefectiveQuantity] = useState('');
  const [creator, setCreator] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [machine, setMachine] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [errorCause, setErrorCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [audioFiles, setAudioFiles] = useState<{
    problemDescription?: string | null;
    errorCause?: string | null;
    correctiveAction?: string | null;
  }>({});

  useEffect(() => {
    loadDepartmentsData();
  }, [refreshDepartments]);

  const loadDepartmentsData = () => {
    setDepartments(getDepartments());
    setEmployees(getEmployees());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!orderNumber || !defectiveQuantity || !totalDefectiveQuantity || 
          !creator || !personalNumber || !problemDescription || 
          !errorCause || !correctiveAction || !selectedDepartment || !selectedEmployee) {
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

      const report = {
        id: generateErrorReportId(),
        accessNumber: generateAccessNumber(),
        orderNumber,
        afoNumber: afoNumber || undefined,
        defectiveQuantity: parseInt(defectiveQuantity),
        totalDefectiveQuantity: parseInt(totalDefectiveQuantity),
        creator,
        personalNumber,
        machine: machine || undefined,
        problemDescription,
        errorCause,
        correctiveAction,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: teamLeader.account?.username || teamLeader.name,
        audioFiles,
        departmentId: selectedDepartment,
        creatorId: selectedEmployee
      };

      saveErrorReport(report);
      
      // Reset form
      setOrderNumber('');
      setAfoNumber('');
      setDefectiveQuantity('');
      setTotalDefectiveQuantity('');
      setCreator('');
      setPersonalNumber('');
      setMachine('');
      setProblemDescription('');
      setErrorCause('');
      setCorrectiveAction('');
      setSelectedDepartment('');
      setSelectedEmployee('');
      setAudioFiles({});

      onReportCreated();
    } catch (error) {
      console.error('Fehler beim Speichern der Fehlermeldung:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = selectedDepartment 
    ? employees.filter(emp => emp.departmentId === selectedDepartment)
    : [];

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
              <Label htmlFor="afoNumber">AFO-Nummer</Label>
              <Input
                id="afoNumber"
                value={afoNumber}
                onChange={(e) => setAfoNumber(e.target.value)}
                placeholder="z.B. AFO-12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="totalDefectiveQuantity">Gesamtmenge *</Label>
              <Input
                id="totalDefectiveQuantity"
                type="number"
                value={totalDefectiveQuantity}
                onChange={(e) => setTotalDefectiveQuantity(e.target.value)}
                placeholder="Gesamtanzahl Teile"
                min="1"
                required
              />
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creator">Name des Erstellers *</Label>
              <Input
                id="creator"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>
            <div>
              <Label htmlFor="personalNumber">Personalnummer *</Label>
              <Input
                id="personalNumber"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                placeholder="z.B. 12345"
                required
              />
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
            <Label htmlFor="errorCause">Fehlerursache *</Label>
            <Textarea
              id="errorCause"
              value={errorCause}
              onChange={(e) => setErrorCause(e.target.value)}
              placeholder="Beschreiben Sie die identifizierte Ursache des Fehlers..."
              rows={3}
              required
            />
            <AudioRecorder 
              onTranscription={(transcription, audioBlob) => {
                setErrorCause(transcription);
                setAudioFiles(prev => ({...prev, errorCause: audioBlob}));
              }}
              label="Fehlerursache aufnehmen"
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
