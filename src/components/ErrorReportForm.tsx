
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { 
  saveErrorReport, 
  getDepartments, 
  getMachines, 
  getEmployeesByDepartment,
  uploadAudioFile 
} from '@/lib/supabaseStorage';
import { useAuth } from '@/hooks/useAuth';
import AudioRecorder from './AudioRecorder';
import SearchableCombobox from './SearchableCombobox';
import { toast } from "sonner";

interface ErrorReportFormProps {
  onReportCreated: () => void;
  refreshDepartments: boolean;
}

const ErrorReportForm: React.FC<ErrorReportFormProps> = ({ onReportCreated, refreshDepartments }) => {
  const { user, profile } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [afoNumber, setAfoNumber] = useState('');
  const [defectiveQuantity, setDefectiveQuantity] = useState('');
  const [machine, setMachine] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [audioBlobs, setAudioBlobs] = useState<{
    problemDescription?: Blob;
    correctiveAction?: Blob;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [lastCreatedReportId, setLastCreatedReportId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      loadEmployees(selectedDepartment);
    }
  }, [selectedDepartment]);

  // Auto-hide success message after 2 minutes
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setLastCreatedReportId(null);
      }, 120000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadData = async () => {
    try {
      const [depts, machs] = await Promise.all([
        getDepartments(),
        getMachines()
      ]);
      setDepartments(depts);
      setMachines(machs);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Fehler beim Laden der Daten');
    }
  };

  const loadEmployees = async (departmentId: string) => {
    try {
      const emps = await getEmployeesByDepartment(departmentId);
      setEmployees(emps);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber || !afoNumber || !defectiveQuantity || 
        !problemDescription || !correctiveAction || 
        !selectedDepartment || !user || !profile) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setShowReview(true);
  };

  const handleFinalSubmit = async () => {
    if (!user || !profile) {
      toast.error('Benutzer nicht angemeldet');
      return;
    }

    setIsSubmitting(true);

    try {
      // Fehlermeldung speichern
      const reportData = {
        order_number: orderNumber,
        afo_number: afoNumber,
        defective_quantity: parseInt(defectiveQuantity),
        total_defective_quantity: parseInt(defectiveQuantity),
        machine_id: machine || null,
        problem_description: problemDescription,
        error_cause: problemDescription,
        corrective_action: correctiveAction,
        creator_id: user.id,
        creator_name: profile.name,
        personal_number: profile.personal_number,
        department_id: selectedDepartment,
        approval_status: 'pending' as const
      };

      const savedReport = await saveErrorReport(reportData);
      
      // Audio-Dateien hochladen falls vorhanden
      if (audioBlobs.problemDescription) {
        await uploadAudioFile(savedReport.id, 'problemDescription', audioBlobs.problemDescription);
      }
      if (audioBlobs.correctiveAction) {
        await uploadAudioFile(savedReport.id, 'correctiveAction', audioBlobs.correctiveAction);
      }

      setShowSuccess(true);
      setShowReview(false);
      setLastCreatedReportId(savedReport.id);
      
      toast.success('Fehlermeldung erfolgreich erstellt');
      onReportCreated();
    } catch (error) {
      console.error('Fehler beim Speichern der Fehlermeldung:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReport = () => {
    setShowReview(false);
  };

  const handleNewReport = () => {
    setOrderNumber('');
    setAfoNumber('');
    setDefectiveQuantity('');
    setMachine('');
    setProblemDescription('');
    setCorrectiveAction('');
    setSelectedDepartment('');
    setAudioBlobs({});
    setShowSuccess(false);
    setLastCreatedReportId(null);
  };

  if (showReview) {
    const selectedDept = departments.find((dept: any) => dept.id === selectedDepartment);
    const selectedMach = machines.find((mach: any) => mach.id === machine);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Fehlermeldung überprüfen</span>
          </CardTitle>
          <CardDescription>
            Bitte überprüfen Sie Ihre Eingaben vor dem finalen Erstellen der Fehlermeldung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Auftragsnummer</Label>
              <p className="text-sm bg-muted p-2 rounded">{orderNumber}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">AFO-Nummer</Label>
              <p className="text-sm bg-muted p-2 rounded">{afoNumber}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Fehlerhafte Menge</Label>
            <p className="text-sm bg-muted p-2 rounded">{defectiveQuantity}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Abteilung</Label>
              <p className="text-sm bg-muted p-2 rounded">{selectedDept?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Ersteller</Label>
              <p className="text-sm bg-muted p-2 rounded">{profile?.name}</p>
            </div>
          </div>

          {machine && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Feststellort</Label>
              <p className="text-sm bg-muted p-2 rounded">{selectedMach?.name}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Problembeschreibung</Label>
            <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{problemDescription}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Korrekturmaßnahme</Label>
            <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{correctiveAction}</p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={handleEditReport} variant="outline" className="flex-1">
              Bearbeiten
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Wird erstellt...' : 'Abschicken'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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

          <div>
            <Label htmlFor="selectedDepartment">Abteilung *</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
              <SelectTrigger>
                <SelectValue placeholder="Abteilung auswählen" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department: any) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="machine">Feststellort</Label>
            <SearchableCombobox
              options={machines.map((machine: any) => ({ value: machine.id, label: machine.name }))}
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
                if (audioBlob && typeof audioBlob !== 'string') {
                  setAudioBlobs(prev => ({...prev, problemDescription: audioBlob}));
                }
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
                if (audioBlob && typeof audioBlob !== 'string') {
                  setAudioBlobs(prev => ({...prev, correctiveAction: audioBlob}));
                }
              }}
              label="Korrekturmaßnahme aufnehmen"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Zur Übersicht
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ErrorReportForm;
