import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Save, AlertTriangle, Copy, Key } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import { ErrorReport, saveErrorReport, generateErrorReportId, generateAccessNumber } from '@/lib/storage';
import { toast } from "sonner";

interface ErrorReportFormProps {
  onReportCreated: () => void;
}

// Available team leaders
const availableTeamLeaders = [
  { value: 'Test', label: 'Test' },
  { value: 'Test2', label: 'Test2' }
];

const ErrorReportForm: React.FC<ErrorReportFormProps> = ({
  onReportCreated
}) => {
  const [accessNumber, setAccessNumber] = useState('');
  
  const [formData, setFormData] = useState({
    orderNumber: '',
    afoNumber: '',
    defectiveQuantity: '',
    totalDefectiveQuantity: '',
    creatorName: '',
    personalNumber: '',
    machine: '',
    problemDescription: '',
    errorCause: '',
    correctiveAction: '',
    assignedTeamLeader: ''
  });

  const [audioData, setAudioData] = useState({
    problemAudio: null as string | null,
    errorCauseAudio: null as string | null,
    correctiveActionAudio: null as string | null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zugriffsnummer beim Laden der Komponente generieren
  useEffect(() => {
    setAccessNumber(generateAccessNumber());
  }, []);

  const copyAccessNumber = async () => {
    try {
      await navigator.clipboard.writeText(accessNumber);
      toast.success('Zugriffsnummer kopiert!');
    } catch (error) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAudioTranscription = (field: string, transcription: string, audioBlob: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: transcription
    }));
    setAudioData(prev => ({
      ...prev,
      [`${field}Audio`]: audioBlob
    }));
  };

  const validateForm = () => {
    const required = ['orderNumber', 'afoNumber', 'defectiveQuantity', 'totalDefectiveQuantity', 'creatorName', 'personalNumber', 'machine', 'problemDescription', 'errorCause', 'correctiveAction', 'assignedTeamLeader'];
    
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`Bitte füllen Sie das Feld "${getFieldLabel(field)}" aus`);
        return false;
      }
    }

    if (isNaN(Number(formData.defectiveQuantity)) || Number(formData.defectiveQuantity) <= 0) {
      toast.error('Beanstandete Menge muss eine positive Zahl sein');
      return false;
    }

    if (isNaN(Number(formData.totalDefectiveQuantity)) || Number(formData.totalDefectiveQuantity) <= 0) {
      toast.error('Gesamt beanstandete Menge muss eine positive Zahl sein');
      return false;
    }

    if (Number(formData.defectiveQuantity) > Number(formData.totalDefectiveQuantity)) {
      toast.error('Beanstandete Menge kann nicht größer als die Gesamtmenge sein');
      return false;
    }

    return true;
  };

  const getFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      orderNumber: 'Auftragsnummer',
      afoNumber: 'AFO-Nummer',
      defectiveQuantity: 'Beanstandete Menge',
      totalDefectiveQuantity: 'Gesamt beanstandete Menge',
      creatorName: 'Name',
      personalNumber: 'Personal-Nummer',
      machine: 'Maschine',
      problemDescription: 'Problembeschreibung',
      errorCause: 'Fehlerursache',
      correctiveAction: 'Korrekturmaßnahme',
      assignedTeamLeader: 'Teamleiter'
    };
    return labels[field] || field;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const reportId = generateErrorReportId();
      
      const newReport: ErrorReport = {
        id: reportId,
        accessNumber: accessNumber,
        orderNumber: formData.orderNumber,
        afoNumber: formData.afoNumber,
        defectiveQuantity: Number(formData.defectiveQuantity),
        totalDefectiveQuantity: Number(formData.totalDefectiveQuantity),
        creator: formData.creatorName,
        personalNumber: formData.personalNumber,
        machine: formData.machine,
        problemDescription: formData.problemDescription,
        errorCause: formData.errorCause,
        correctiveAction: formData.correctiveAction,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending',
        assignedTeamLeader: formData.assignedTeamLeader,
        audioFiles: {
          problemDescription: audioData.problemAudio,
          errorCause: audioData.errorCauseAudio,
          correctiveAction: audioData.correctiveActionAudio
        }
      };

      saveErrorReport(newReport);
      
      // Form zurücksetzen und neue Zugriffsnummer generieren
      setFormData({
        orderNumber: '',
        afoNumber: '',
        defectiveQuantity: '',
        totalDefectiveQuantity: '',
        creatorName: '',
        personalNumber: '',
        machine: '',
        problemDescription: '',
        errorCause: '',
        correctiveAction: '',
        assignedTeamLeader: ''
      });

      setAudioData({
        problemAudio: null,
        errorCauseAudio: null,
        correctiveActionAudio: null
      });

      setAccessNumber(generateAccessNumber());

      toast.success(`Fehlermeldung #${reportId} erfolgreich erstellt! Zugriffsnummer: ${accessNumber}`);
      onReportCreated();
      
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Fehlermeldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <span>Neue Fehlermeldung erfassen</span>
        </CardTitle>
        <CardDescription>
          Bitte füllen Sie alle Pflichtfelder aus, um eine neue Fehlermeldung zu erstellen.
        </CardDescription>
        
        {/* Zugriffsnummer Anzeige */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">Zugriffsnummer für diese Meldung</h4>
                <p className="text-sm text-blue-700">Diese Nummer wird benötigt, um die Meldung später einzusehen</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-mono font-bold text-blue-900 bg-white px-3 py-1 rounded border">
                {accessNumber}
              </span>
              <Button variant="outline" size="sm" onClick={copyAccessNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Auftragsdaten */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Auftragsdaten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Auftragsnummer *</Label>
              <Input
                id="orderNumber"
                placeholder="z.B. AUF-2024-001"
                value={formData.orderNumber}
                onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afoNumber">AFO-Nummer *</Label>
              <Input
                id="afoNumber"
                placeholder="z.B. AFO-12345"
                value={formData.afoNumber}
                onChange={(e) => handleInputChange('afoNumber', e.target.value)}
                className="text-lg h-12"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Mengendaten */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Mengendaten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defectiveQuantity">Beanstandete Menge *</Label>
              <Input
                id="defectiveQuantity"
                type="number"
                placeholder="Anzahl"
                value={formData.defectiveQuantity}
                onChange={(e) => handleInputChange('defectiveQuantity', e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDefectiveQuantity">Gesamt beanstandete Menge (von Auftrag) *</Label>
              <Input
                id="totalDefectiveQuantity"
                type="number"
                placeholder="Gesamtanzahl"
                value={formData.totalDefectiveQuantity}
                onChange={(e) => handleInputChange('totalDefectiveQuantity', e.target.value)}
                className="text-lg h-12"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Ersteller und Maschine */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ersteller und Maschine</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creatorName">Name *</Label>
              <Input
                id="creatorName"
                placeholder="Vor- und Nachname"
                value={formData.creatorName}
                onChange={(e) => handleInputChange('creatorName', e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalNumber">Personal-Nummer *</Label>
              <Input
                id="personalNumber"
                placeholder="z.B. 12345"
                value={formData.personalNumber}
                onChange={(e) => handleInputChange('personalNumber', e.target.value)}
                className="text-lg h-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine">Maschine *</Label>
            <Input
              id="machine"
              placeholder="z.B. CNC Drehmaschine 01"
              value={formData.machine}
              onChange={(e) => handleInputChange('machine', e.target.value)}
              className="text-lg h-12"
            />
          </div>
        </div>

        <Separator />

        {/* Teamleiter Zuweisung */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Zuweisung</h3>
          <div className="space-y-2">
            <Label htmlFor="assignedTeamLeader">Teamleiter *</Label>
            <Select
              value={formData.assignedTeamLeader}
              onValueChange={(value) => handleInputChange('assignedTeamLeader', value)}
            >
              <SelectTrigger className="text-lg h-12">
                <SelectValue placeholder="Teamleiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                {availableTeamLeaders.map((leader) => (
                  <SelectItem key={leader.value} value={leader.value}>
                    {leader.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Problembeschreibung */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Problembeschreibung *</h3>
          <div className="space-y-4">
            <Textarea
              placeholder="Beschreiben Sie das Problem detailliert..."
              value={formData.problemDescription}
              onChange={(e) => handleInputChange('problemDescription', e.target.value)}
              className="text-lg min-h-[100px]"
            />
            <AudioRecorder
              onTranscription={(transcription, audioBlob) => 
                handleAudioTranscription('problemDescription', transcription, audioBlob)
              }
              label="Oder Problembeschreibung aufnehmen"
            />
          </div>
        </div>

        <Separator />

        {/* Fehlerursache */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fehlerursache *</h3>
          <div className="space-y-4">
            <Textarea
              placeholder="Was war die Ursache des Problems?"
              value={formData.errorCause}
              onChange={(e) => handleInputChange('errorCause', e.target.value)}
              className="text-lg min-h-[100px]"
            />
            <AudioRecorder
              onTranscription={(transcription, audioBlob) => 
                handleAudioTranscription('errorCause', transcription, audioBlob)
              }
              label="Oder Fehlerursache aufnehmen"
            />
          </div>
        </div>

        <Separator />

        {/* Korrekturmaßnahme */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Korrekturmaßnahme *</h3>
          <div className="space-y-4">
            <Textarea
              placeholder="Welche Maßnahmen wurden ergriffen?"
              value={formData.correctiveAction}
              onChange={(e) => handleInputChange('correctiveAction', e.target.value)}
              className="text-lg min-h-[100px]"
            />
            <AudioRecorder
              onTranscription={(transcription, audioBlob) => 
                handleAudioTranscription('correctiveAction', transcription, audioBlob)
              }
              label="Oder Korrekturmaßnahme aufnehmen"
            />
          </div>
        </div>

        <Separator />

        {/* Submit Button */}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="h-14 px-8 text-lg" disabled={isSubmitting}>
                <Save className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Speichere...' : 'Fehlermeldung abschließen'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fehlermeldung abschließen</AlertDialogTitle>
                <AlertDialogDescription>
                  Sind Sie sicher, dass Sie die Fehlermeldung abschließen möchten? 
                  Nach dem Speichern können die Daten nicht mehr bearbeitet werden.
                  Die Meldung wird automatisch an Ihren Team-/Schichtleiter zur Freigabe weitergeleitet.
                  <br/><br/>
                  <strong>Wichtig:</strong> Notieren Sie sich die Zugriffsnummer <strong>{accessNumber}</strong> - Sie benötigen diese, um die Meldung später einzusehen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>
                  Ja, abschließen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorReportForm;
