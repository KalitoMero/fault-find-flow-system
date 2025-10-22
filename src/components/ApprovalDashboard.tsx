
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock, User, Package } from 'lucide-react';
import { updateErrorReportStatus } from '@/lib/supabaseStorage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ErrorReport {
  id: string;
  order_number: string;
  afo_number: string;
  machine_id?: string;
  defective_quantity: number;
  total_defective_quantity: number;
  quantity_type?: string;
  problem_description: string;
  corrective_action: string;
  creator_name: string;
  personal_number?: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

interface ApprovalDashboardProps {
  reports: ErrorReport[];
  onApprovalChange: () => void;
}

const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ reports, onApprovalChange }) => {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (reportId: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      await updateErrorReportStatus(reportId, 'approved', undefined, user.id);
      toast.success("Fehlermeldung freigegeben");
      onApprovalChange();
    } catch (error) {
      toast.error("Fehler beim Freigeben der Meldung");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reportId: string, reason: string) => {
    if (!user) return;
    if (!reason.trim()) {
      toast.error("Bitte geben Sie einen Ablehnungsgrund an");
      return;
    }

    setIsProcessing(true);
    try {
      await updateErrorReportStatus(reportId, 'rejected', reason, user.id);
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
                    <h3 className="font-medium text-base">
                      PBA: {report.order_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      AFO: {report.afo_number}
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
                  <p className="font-medium">{report.creator_name}</p>
                  <p className="text-sm text-gray-600">
                    Personal-Nr: {report.personal_number} | {formatDate(report.created_at)}
                  </p>
                </div>
              </div>

              {/* Mengendaten */}
              <div className="flex items-center space-x-4 p-3 bg-red-50 rounded-lg">
                <Package className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">
                    {report.quantity_type || 'Beanstandete Menge'}: {report.defective_quantity} von {report.total_defective_quantity}
                  </p>
                </div>
              </div>

              {/* Problem Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Problembeschreibung:</h4>
                <p className="text-gray-700 p-3 bg-gray-50 rounded border-l-4 border-l-blue-400">
                  {report.problem_description.slice(0, 200)}
                  {report.problem_description.length > 200 && '...'}
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
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex-1">
                             <label className="font-medium text-sm">PBA:</label>
                             <p className="text-gray-700 text-sm">{selectedReport.order_number}</p>
                           </div>
                           <div className="flex-1">
                             <label className="font-medium text-sm">AFO-Nummer:</label>
                             <p className="text-gray-700 text-sm">{selectedReport.afo_number}</p>
                           </div>
                           <div className="flex-1">
                             <label className="font-medium text-sm">{selectedReport.quantity_type || 'Beanstandete Menge'}:</label>
                             <p className="text-gray-700 text-sm">{selectedReport.defective_quantity}</p>
                           </div>
                           <div className="flex-1">
                             <label className="font-medium text-sm">Gesamt:</label>
                             <p className="text-gray-700 text-sm">{selectedReport.total_defective_quantity}</p>
                           </div>
                           <div className="flex-1">
                             <label className="font-medium text-sm">Erstellt am:</label>
                             <p className="text-gray-700 text-sm">{formatDate(selectedReport.created_at)}</p>
                           </div>
                         </div>

                        <div className="space-y-4">
                          <div>
                            <label className="font-medium">Problembeschreibung:</label>
                            <p className="text-gray-700 p-3 bg-gray-50 rounded mt-2">
                              {selectedReport.problem_description}
                            </p>
                          </div>

                          <div>
                            <label className="font-medium">Korrekturmaßnahme:</label>
                            <p className="text-gray-700 p-3 bg-gray-50 rounded mt-2">
                              {selectedReport.corrective_action}
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
