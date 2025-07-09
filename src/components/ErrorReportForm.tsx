
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Save, AlertTriangle } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import { ErrorReport, saveErrorReport, generateErrorReportId } from '@/lib/storage';
import { toast } from "sonner";

interface ErrorReportFormProps {
  currentUser: string;
  currentPersonalNumber: string;
  onReportCreated: () => void;
}

const ErrorReportForm: React.FC<ErrorReportFormProps> = ({
  currentUser,
  currentPersonalNumber,
  onReportCreated
}) => {
  const [formData, setFormData] = useState({
    orderNumber: '',
    afoNumber: '',
    defectiveQuantity: '',
    totalDefectiveQuantity: '',
    machine: '',
    problemDescription: '',
    errorCause: '',
    correctiveAction: ''
  });

  const [audioData, setAudioData] = useState({
    problemAudio: null as string | null,
    errorCauseAudio: null as string | null,
    correctiveActionAudio: null as string | null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const machines = [
    'Maschine 01 - CNC Drehmaschine',
    'Maschine 02 - Fräsmaschine',
    'Maschine 03 - Bohrmaschine',
    'Maschine 04 - Schleifmaschine',
    'Maschine 05 - Pressmaschine',
    'Maschine 06 - Schweißanlage',
    'Maschine 07 - Montagestation',
    'Maschine 08 - Prüfstand'
  ];

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
    const required = ['orderNumber', 'afoNumber', 'defectiveQuantity', 'totalDefectiveQuantity', 'machine', 'problemDescription', 'errorCause', 'correctiveAction'];
    
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
      machine: 'Maschine',
      problemDescription: 'Problembeschreibung',
      errorCause: 'Fehlerursache',
      correctiveAction: 'Korrekturmaßnahme'
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
        orderNumber: formData.orderNumber,
        afoNumber: formData.afoNumber,
        defectiveQuantity: Number(formData.defectiveQuantity),
        totalDefectiveQuantity: Number(formData.totalDefectiveQuantity),
        creator: currentUser,
        personalNumber: currentPersonalNumber,
        machine: formData.machine,
        problemDescription: formData.problemDescription,
        errorCause: formData.errorCause,
        correctiveAction: formData.correctiveAction,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending',
        audioFiles: {
          problemDescription: audioData.problemAudio,
          errorCause: audioData.errorCauseAudio,
          correctiveAction: audioData.correctiveActionAudio
        }
      };

      saveErrorReport(newReport);
      
      // Form zurücksetzen
      setFormData({
        orderNumber: '',
        afoNumber: '',
        defectiveQuantity: '',
        totalDefectiveQuantity: '',
        machine: '',
        problemDescription: '',
        errorCause: '',
        correctiveAction: ''
      });

      setAudioData({
        problemAudio: null,
        errorCauseAudio: null,
        correctiveActionAudio: null
      });

      toast.success(`Fehlermeldung #${reportId} erfolgreich erstellt!`);
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
              <Label>Ersteller</Label>
              <Input
                value={`${currentUser} (${currentPersonalNumber})`}
                disabled
                className="text-lg h-12 bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine">Maschine *</Label>
              <Select value={formData.machine} onValueChange={(value) => handleInputChange('machine', value)}>
                <SelectTrigger className="text-lg h-12">
                  <SelectValue placeholder="Maschine auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
