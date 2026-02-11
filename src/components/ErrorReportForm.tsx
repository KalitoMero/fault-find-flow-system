
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Printer, Pencil, Check } from 'lucide-react';
import { 
  saveErrorReport, 
  getDepartments, 
  getMachines, 
  getEmployeesByDepartment,
  uploadAudioFile 
} from '@/lib/storage';
import { extractResourcesFromExcel } from '@/lib/resourceUtils';
import api from '@/lib/apiClient';
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
  const [selectedResource, setSelectedResource] = useState('');
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [isEditingReview, setIsEditingReview] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      loadEmployees(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    loadAvailableResources();
  }, []);

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

  const loadAvailableResources = async () => {
    try {
      const settings = await api.get('/api/excel/settings');
      
      if (settings?.resource_column) {
        const resources = await extractResourcesFromExcel(settings.resource_column);
        setAvailableResources(resources);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ressourcen:', error);
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
      // Generate a unique ID for the report
      const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Fehlermeldung speichern
      const reportData: import('@/lib/storage').ErrorReport = {
        id: reportId,
        orderNumber: orderNumber,
        afoNumber: afoNumber,
        defectiveQuantity: parseInt(defectiveQuantity),
        totalDefectiveQuantity: parseInt(defectiveQuantity),
        machine: machine || '',
        problemDescription: problemDescription,
        errorCause: problemDescription,
        correctiveAction: correctiveAction,
        creator: profile.name,
        personalNumber: profile.personal_number || '',
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
        assignedTeamLeader: '',
        excelDepartment: selectedDepartment,
        resourceName: selectedResource || undefined
      };

      const savedReport = await saveErrorReport(reportData);
      
      // Audio wird nur zu N8N gesendet, nicht gespeichert
      
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
    setIsEditingReview(!isEditingReview);
  };

  const handleNewReport = () => {
    setOrderNumber('');
    setAfoNumber('');
    setDefectiveQuantity('');
    setMachine('');
    setProblemDescription('');
    setCorrectiveAction('');
    setSelectedDepartment('');
    setSelectedResource('');
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
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Ba-Nr.
                {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
              </Label>
              {isEditingReview ? (
                <Input 
                  value={orderNumber} 
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="border-2 border-blue-400 focus:border-blue-600"
                />
              ) : (
                <p className="text-sm bg-muted p-2 rounded">{orderNumber}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                AFO-Nummer
                {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
              </Label>
              {isEditingReview ? (
                <Input 
                  value={afoNumber} 
                  onChange={(e) => setAfoNumber(e.target.value)}
                  className="border-2 border-blue-400 focus:border-blue-600"
                />
              ) : (
                <p className="text-sm bg-muted p-2 rounded">{afoNumber}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Fehlerhafte Menge
              {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
            </Label>
            {isEditingReview ? (
              <Input 
                type="number" 
                value={defectiveQuantity} 
                onChange={(e) => setDefectiveQuantity(e.target.value)}
                className="border-2 border-blue-400 focus:border-blue-600"
              />
            ) : (
              <p className="text-sm bg-muted p-2 rounded">{defectiveQuantity}</p>
            )}
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

          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Feststellort
              {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
            </Label>
            {isEditingReview ? (
              <SearchableCombobox
                options={machines.map(m => ({ value: m.id, label: m.name }))}
                value={machine}
                onValueChange={setMachine}
                placeholder="Feststellort auswählen"
                className="w-full border-2 border-blue-400"
              />
            ) : (
              <p className="text-sm bg-muted p-2 rounded">
                {machines.find(m => m.id === machine)?.name || 'Nicht angegeben'}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Ressource
              {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
            </Label>
            {isEditingReview ? (
              <SearchableCombobox
                options={availableResources.map(r => ({ value: r, label: r }))}
                value={selectedResource}
                onValueChange={setSelectedResource}
                placeholder="Ressource auswählen"
                className="w-full border-2 border-blue-400"
              />
            ) : (
              <p className="text-sm bg-muted p-2 rounded">
                {selectedResource || 'Keine Ressource ausgewählt'}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Problembeschreibung
              {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
            </Label>
            {isEditingReview ? (
              <Textarea 
                value={problemDescription} 
                onChange={(e) => setProblemDescription(e.target.value)} 
                rows={3}
                className="border-2 border-blue-400 focus:border-blue-600"
              />
            ) : (
              <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{problemDescription}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Korrekturmaßnahme
              {isEditingReview && <Pencil className="h-4 w-4 text-primary" />}
            </Label>
            {isEditingReview ? (
              <Textarea 
                value={correctiveAction} 
                onChange={(e) => setCorrectiveAction(e.target.value)} 
                rows={3}
                className="border-2 border-blue-400 focus:border-blue-600"
              />
            ) : (
              <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{correctiveAction}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={handleEditReport} variant="outline" className="flex-1">
              {isEditingReview ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Änderungen übernehmen
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Felder bearbeiten
                </>
              )}
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
              <Label htmlFor="orderNumber">Ba-Nr. *</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="z.B. 20250"
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
            <Label htmlFor="resource" className="text-base font-semibold">
              Ressource (optional, aber empfohlen)
            </Label>
            <SearchableCombobox
              options={availableResources.map(resource => ({ 
                value: resource, 
                label: resource 
              }))}
              value={selectedResource}
              onValueChange={setSelectedResource}
              placeholder="Ressource auswählen..."
              searchPlaceholder="Ressource suchen..."
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wählen Sie die betroffene Ressource/Maschine aus
            </p>
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
