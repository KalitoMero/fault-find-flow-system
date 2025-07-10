
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, XCircle, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { ErrorReport, updateErrorReportStatus, getErrorReports } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ErrorReportDetailProps {
  report: ErrorReport;
  onBack: () => void;
  onStatusChange: () => void;
}

const ErrorReportDetail = ({ report, onBack, onStatusChange }: ErrorReportDetailProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleApprove = async () => {
    if (!isAuthenticated) return;
    
    setIsSubmitting(true);
    try {
      updateErrorReportStatus(report.id, 'approved');
      toast.success('Fehlermeldung wurde freigegeben!');
      onStatusChange();
    } catch (error) {
      toast.error('Fehler beim Freigeben der Meldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!isAuthenticated || !rejectionReason.trim()) {
      toast.error('Bitte geben Sie einen Ablehnungsgrund ein');
      return;
    }
    
    setIsSubmitting(true);
    try {
      updateErrorReportStatus(report.id, 'rejected', rejectionReason);
      toast.success('Fehlermeldung wurde abgelehnt!');
      onStatusChange();
      setShowRejectionForm(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Meldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated) return;
    
    if (!confirm('Sind Sie sicher, dass Sie diese Fehlermeldung dauerhaft löschen möchten?')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Lade alle Berichte und entferne den entsprechenden
      const allReports = getErrorReports();
      const updatedReports = allReports.filter(r => r.id !== report.id);
      
      // Speichere die gefilterte Liste zurück
      localStorage.setItem('production_error_reports', JSON.stringify(updatedReports));
      
      toast.success('Fehlermeldung wurde erfolgreich gelöscht!');
      
      // Trigger onStatusChange to refresh the list, then navigate back
      onStatusChange();
      onBack(); // Zurück zur Übersicht
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen der Fehlermeldung');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getStatusBadge = () => {
    switch (report.approvalStatus) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Freigegeben</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary">Zur Prüfung</Badge>;
    }
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <span>Fehlermeldung #{report.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge()}
                {isAuthenticated && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {isDeleting ? 'Lösche...' : 'Löschen'}
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Erstellt am {formatDate(report.createdAt)} von {report.creator}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Zugriffsnummer für Teamleiter */}
            {isAuthenticated && (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Zugriffsnummer für Mitarbeiter</h3>
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-900 tracking-widest">
                    {report.accessNumber}
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    Mitarbeiter können diese Nummer verwenden, um die Meldung nach der Freigabe einzusehen.
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Grunddaten */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Auftragsdaten</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Auftragsnummer:</span>
                    <p className="font-medium">{report.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">AFO-Nummer:</span>
                    <p className="font-medium">{report.afoNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Maschine:</span>
                    <p className="font-medium">{report.machine}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mengenangaben</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Beanstandete Menge:</span>
                    <p className="font-medium">{report.defectiveQuantity}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Ersteller:</span>
                    <p className="font-medium">{report.creator}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Problembeschreibung */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Problembeschreibung</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{report.problemDescription}</p>
              </div>
            </div>

            <Separator />

            {/* Korrekturmaßnahme */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Korrekturmaßnahme</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{report.correctiveAction}</p>
              </div>
            </div>

            {/* Ablehnungsgrund anzeigen */}
            {report.rejectionReason && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">Ablehnungsgrund</h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{report.rejectionReason}</p>
                  </div>
                </div>
              </>
            )}

            {/* Freigabe-Aktionen für Teamleiter */}
            {isAuthenticated && report.approvalStatus === 'pending' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Freigabe-Entscheidung</h3>
                  
                  {!showRejectionForm ? (
                    <div className="flex space-x-4">
                      <Button 
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Freigebe...' : 'Freigeben'}
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => setShowRejectionForm(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ablehnungsgrund (erforderlich)
                        </label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Bitte geben Sie den Grund für die Ablehnung an..."
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex space-x-4">
                        <Button 
                          variant="destructive"
                          onClick={handleReject}
                          disabled={isSubmitting || !rejectionReason.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Lehne ab...' : 'Ablehnen'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowRejectionForm(false);
                            setRejectionReason('');
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorReportDetail;
