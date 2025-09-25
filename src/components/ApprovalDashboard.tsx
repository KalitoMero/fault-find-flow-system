
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Play, Clock, User, Package } from 'lucide-react';
import { ErrorReport, updateErrorReportStatus } from '@/lib/storage';
import { toast } from "sonner";

interface ApprovalDashboardProps {
  reports: ErrorReport[];
  onApprovalChange: () => void;
}

const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ reports, onApprovalChange }) => {
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (reportId: string) => {
    setIsProcessing(true);
    try {
      updateErrorReportStatus(reportId, 'approved');
      toast.success("Fehlermeldung freigegeben");
      onApprovalChange();
    } catch (error) {
      toast.error("Fehler beim Freigeben der Meldung");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reportId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Bitte geben Sie einen Ablehnungsgrund an");
      return;
    }

    setIsProcessing(true);
    try {
      updateErrorReportStatus(reportId, 'rejected', reason);
      toast.success("Fehlermeldung zur Überarbeitung zurückgewiesen");
      setRejectionReason('');
      setSelectedReport(null);
      onApprovalChange();
    } catch (error) {
      toast.error("Fehler beim Ablehnen der Meldung");
    } finally {
      setIsProcessing(false);
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

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Alle Meldungen bearbeitet
          </h3>
          <p className="text-gray-500">
            Zur Zeit sind keine Fehlermeldungen zur Freigabe vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-yellow-600" />
            <span>Fehlermeldungen zur Freigabe</span>
            <Badge variant="secondary">{reports.length}</Badge>
          </CardTitle>
          <CardDescription>
            Prüfen und genehmigen Sie die eingereichten Fehlermeldungen
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    #{report.id}
                  </Badge>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Auftrag: {report.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      AFO: {report.afoNumber} | Maschine: {report.machine}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Zur Prüfung</span>
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
                    Personal-Nr: {report.personalNumber} | {formatDate(report.createdAt)}
                  </p>
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

              {/* Problem Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Problembeschreibung:</h4>
                <p className="text-gray-700 p-3 bg-gray-50 rounded border-l-4 border-l-blue-400">
                  {report.problemDescription.slice(0, 200)}
                  {report.problemDescription.length > 200 && '...'}
                </p>
              </div>

              {/* Aktions-Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setSelectedReport(report)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Details anzeigen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Fehlermeldung #{report.id} - Details
                      </DialogTitle>
                      <DialogDescription>
                        Vollständige Ansicht der Fehlermeldung zur Prüfung
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedReport && (
                      <div className="space-y-6">
                        {/* Basis-Infos */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="font-medium">Auftragsnummer:</label>
                            <p className="text-gray-700">{selectedReport.orderNumber}</p>
                          </div>
                          <div>
                            <label className="font-medium">AFO-Nummer:</label>
                            <p className="text-gray-700">{selectedReport.afoNumber}</p>
                          </div>
                          <div>
                            <label className="font-medium">Beanstandete Menge:</label>
                            <p className="text-gray-700">{selectedReport.defectiveQuantity}</p>
                          </div>
                          <div>
                            <label className="font-medium">Gesamt beanstandet:</label>
                            <p className="text-gray-700">{selectedReport.totalDefectiveQuantity}</p>
                          </div>
                          <div>
                            <label className="font-medium">Maschine:</label>
                            <p className="text-gray-700">{selectedReport.machine}</p>
                          </div>
                          <div>
                            <label className="font-medium">Erstellt am:</label>
                            <p className="text-gray-700">{formatDate(selectedReport.createdAt)}</p>
                          </div>
                        </div>

                        {/* Detailbeschreibungen */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="font-medium">Problembeschreibung:</label>
                              {selectedReport.audioFiles?.problemDescription && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => playAudio(selectedReport.audioFiles!.problemDescription!)}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Audio
                                </Button>
                              )}
                            </div>
                            <p className="text-gray-700 p-3 bg-gray-50 rounded">
                              {selectedReport.problemDescription}
                            </p>
                          </div>


                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="font-medium">Korrekturmaßnahme:</label>
                              {selectedReport.audioFiles?.correctiveAction && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => playAudio(selectedReport.audioFiles!.correctiveAction!)}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Audio
                                </Button>
                              )}
                            </div>
                            <p className="text-gray-700 p-3 bg-gray-50 rounded">
                              {selectedReport.correctiveAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={isProcessing}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Ablehnen
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Fehlermeldung ablehnen</DialogTitle>
                        <DialogDescription>
                          Bitte geben Sie einen Grund für die Ablehnung an. 
                          Die Meldung wird zur Überarbeitung an den Ersteller zurückgesendet.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Grund für die Ablehnung..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectionReason('')}>
                          Abbrechen
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(report.id, rejectionReason)}
                          disabled={isProcessing || !rejectionReason.trim()}
                        >
                          Ablehnen
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => handleApprove(report.id)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Freigeben
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApprovalDashboard;
