
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { ErrorReport, getErrorReports, saveErrorReport } from '@/lib/storage';
import { toast } from "sonner";

interface ErrorReportEditProps {
  report: ErrorReport;
  onBack: () => void;
  onSave: () => void;
}

const ErrorReportEdit = ({ report, onBack, onSave }: ErrorReportEditProps) => {
  const [formData, setFormData] = useState({
    problemDescription: report.problemDescription,
    errorCause: report.errorCause,
    correctiveAction: report.correctiveAction
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.problemDescription.trim()) {
      toast.error('Problembeschreibung darf nicht leer sein');
      return false;
    }
    if (!formData.errorCause.trim()) {
      toast.error('Fehlerursache darf nicht leer sein');
      return false;
    }
    if (!formData.correctiveAction.trim()) {
      toast.error('Korrekturmaßnahme darf nicht leer sein');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Lade alle Berichte und aktualisiere den entsprechenden
      const allReports = getErrorReports();
      const updatedReports = allReports.map(r => {
        if (r.id === report.id) {
          return {
            ...r,
            problemDescription: formData.problemDescription,
            errorCause: formData.errorCause,
            correctiveAction: formData.correctiveAction,
            approvalStatus: 'pending' as const, // Status zurück auf 'pending' setzen
            rejectionReason: undefined // Ablehnungsgrund entfernen
          };
        }
        return r;
      });

      // Speichere alle Berichte zurück
      localStorage.setItem('production_error_reports', JSON.stringify(updatedReports));
      
      toast.success(report.approvalStatus === 'rejected' 
        ? "Fehlermeldung erfolgreich aktualisiert und zur erneuten Prüfung eingereicht!"
        : "Fehlermeldung erfolgreich aktualisiert!");
      onSave();
      
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Änderungen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Übersicht
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <span>Fehlermeldung #{report.id} bearbeiten</span>
            </CardTitle>
            <CardDescription>
              {report.approvalStatus === 'rejected' 
                ? 'Diese Meldung wurde abgelehnt und kann bearbeitet werden. Nach dem Speichern wird sie zur erneuten Prüfung eingereicht.'
                : 'Bearbeiten Sie die Meldungsdetails. Nach dem Speichern wird die Meldung aktualisiert.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Ablehnungsgrund anzeigen nur bei abgelehnten Meldungen */}
            {report.approvalStatus === 'rejected' && report.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Grund für Ablehnung:</h3>
                <p className="text-red-700">{report.rejectionReason}</p>
              </div>
            )}

            {/* Grunddaten (nicht editierbar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium text-gray-600">Auftragsnummer</Label>
                <p className="text-gray-900">{report.orderNumber}</p>
              </div>
              <div>
                <Label className="font-medium text-gray-600">AFO-Nummer</Label>
                <p className="text-gray-900">{report.afoNumber}</p>
              </div>
              <div>
                <Label className="font-medium text-gray-600">Ersteller</Label>
                <p className="text-gray-900">{report.creator}</p>
              </div>
              <div>
                <Label className="font-medium text-gray-600">Maschine</Label>
                <p className="text-gray-900">{report.machine}</p>
              </div>
              <div>
                <Label className="font-medium text-gray-600">Fehlermenge</Label>
                <p className="text-gray-900">{report.defectiveQuantity} von {report.totalDefectiveQuantity}</p>
              </div>
              <div>
                <Label className="font-medium text-gray-600">Erstellt am</Label>
                <p className="text-gray-900">{formatDate(report.createdAt)}</p>
              </div>
            </div>

            <Separator />

            {/* Bearbeitbare Felder */}
            <div className="space-y-6">
              {/* Problembeschreibung */}
              <div className="space-y-2">
                <Label htmlFor="problemDescription" className="text-lg font-semibold">
                  Problembeschreibung *
                </Label>
                <Textarea
                  id="problemDescription"
                  value={formData.problemDescription}
                  onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                  className="text-lg min-h-[120px]"
                  placeholder="Beschreiben Sie das Problem detailliert..."
                />
              </div>

              <Separator />

              {/* Fehlerursache */}
              <div className="space-y-2">
                <Label htmlFor="errorCause" className="text-lg font-semibold">
                  Fehlerursache *
                </Label>
                <Textarea
                  id="errorCause"
                  value={formData.errorCause}
                  onChange={(e) => handleInputChange('errorCause', e.target.value)}
                  className="text-lg min-h-[120px]"
                  placeholder="Was war die Ursache des Problems?"
                />
              </div>

              <Separator />

              {/* Korrekturmaßnahme */}
              <div className="space-y-2">
                <Label htmlFor="correctiveAction" className="text-lg font-semibold">
                  Korrekturmaßnahme *
                </Label>
                <Textarea
                  id="correctiveAction"
                  value={formData.correctiveAction}
                  onChange={(e) => handleInputChange('correctiveAction', e.target.value)}
                  className="text-lg min-h-[120px]"
                  placeholder="Welche Maßnahmen wurden ergriffen?"
                />
              </div>
            </div>

            <Separator />

            {/* Speichern Button */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={onBack}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting}
                size="lg" 
                className="h-12 px-8"
              >
                <Save className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorReportEdit;
