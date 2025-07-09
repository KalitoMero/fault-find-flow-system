
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Play, User, Package, Clock } from 'lucide-react';
import { ErrorReport, updateErrorReportStatus } from '@/lib/storage';
import { toast } from "sonner";

interface ErrorReportDetailProps {
  report: ErrorReport;
  onBack: () => void;
  onStatusChange: () => void;
}

const ErrorReportDetail: React.FC<ErrorReportDetailProps> = ({ 
  report, 
  onBack, 
  onStatusChange 
}) => {
  const handleApprove = () => {
    try {
      updateErrorReportStatus(report.id, 'approved');
      toast.success("Fehlermeldung freigegeben");
      onStatusChange();
    } catch (error) {
      toast.error("Fehler beim Freigeben der Meldung");
    }
  };

  const handleReject = () => {
    try {
      updateErrorReportStatus(report.id, 'rejected', 'Zur Überarbeitung zurückgewiesen');
      toast.success("Fehlermeldung abgelehnt");
      onStatusChange();
    } catch (error) {
      toast.error("Fehler beim Ablehnen der Meldung");
    }
  };

  const playAudio = (audioBase64: string) => {
    if (audioBase64) {
      const audio = new Audio(audioBase64);
      audio.play().catch(error => {
        console.error('Fehler beim Abspielen der Audio:', error);
        toast.error("Audio konnte nicht abgespielt werden");
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  return (
    <div className="space-y-6">
      {/* Header mit Zurück-Button */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Fehlermeldung #{report.id}</h1>
          <p className="text-gray-600">Detailansicht</p>
        </div>
      </div>

      {/* Status und Basis-Infos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Meldungsdetails</CardTitle>
            <Badge 
              variant={
                report.approvalStatus === 'approved' ? 'default' :
                report.approvalStatus === 'rejected' ? 'destructive' : 'secondary'
              }
            >
              {report.approvalStatus === 'approved' ? 'Freigegeben' :
               report.approvalStatus === 'rejected' ? 'Abgelehnt' : 'Zur Prüfung'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ersteller-Info */}
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">{report.creator}</p>
              <p className="text-sm text-gray-600">
                Personal-Nr: {report.personalNumber}
              </p>
            </div>
            <div className="ml-auto">
              <Clock className="h-4 w-4 text-gray-500 inline mr-1" />
              <span className="text-sm text-gray-600">{formatDate(report.createdAt)}</span>
            </div>
          </div>

          {/* Auftragsdaten */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-sm text-gray-700">Auftragsnummer:</label>
              <p className="text-gray-900">{report.orderNumber}</p>
            </div>
            <div>
              <label className="font-medium text-sm text-gray-700">AFO-Nummer:</label>
              <p className="text-gray-900">{report.afoNumber}</p>
            </div>
            <div>
              <label className="font-medium text-sm text-gray-700">Maschine:</label>
              <p className="text-gray-900">{report.machine}</p>
            </div>
            <div>
              <label className="font-medium text-sm text-gray-700">Teamleiter:</label>
              <p className="text-gray-900">{report.assignedSupervisor || 'Nicht zugewiesen'}</p>
            </div>
          </div>

          {/* Mengendaten */}
          <div className="flex items-center space-x-4 p-3 bg-red-50 rounded-lg">
            <Package className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                Beanstandete Menge: {report.defectiveQuantity} von {report.totalDefectiveQuantity}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailbeschreibungen */}
      <Card>
        <CardHeader>
          <CardTitle>Problembeschreibung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Problembeschreibung:</label>
              {report.audioFiles?.problemDescription && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(report.audioFiles!.problemDescription!)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Audio abspielen
                </Button>
              )}
            </div>
            <p className="text-gray-700 p-4 bg-gray-50 rounded border-l-4 border-l-blue-400">
              {report.problemDescription}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Fehlerursache:</label>
              {report.audioFiles?.errorCause && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(report.audioFiles!.errorCause!)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Audio abspielen
                </Button>
              )}
            </div>
            <p className="text-gray-700 p-4 bg-gray-50 rounded border-l-4 border-l-yellow-400">
              {report.errorCause}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Korrekturmaßnahme:</label>
              {report.audioFiles?.correctiveAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(report.audioFiles!.correctiveAction!)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Audio abspielen
                </Button>
              )}
            </div>
            <p className="text-gray-700 p-4 bg-gray-50 rounded border-l-4 border-l-green-400">
              {report.correctiveAction}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aktions-Buttons */}
      {report.approvalStatus === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Freigabe-Entscheidung</CardTitle>
            <CardDescription>
              Entscheiden Sie über die Freigabe dieser Fehlermeldung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button
                onClick={handleReject}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Ablehnen
              </Button>
              <Button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Freigeben
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ErrorReportDetail;
