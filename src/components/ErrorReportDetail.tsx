
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { ErrorReport, updateErrorReportStatus } from '@/lib/storage';
import { toast } from "sonner";

interface ErrorReportDetailProps {
  report: ErrorReport;
  onBack: () => void;
  onStatusChange: () => void;
}

const ErrorReportDetail = ({ report, onBack, onStatusChange }: ErrorReportDetailProps) => {
  const handleApprove = () => {
    try {
      updateErrorReportStatus(report.id, 'approved');
      toast.success("Fehlermeldung freigegeben!");
      onStatusChange();
    } catch (error) {
      toast.error("Fehler beim Freigeben!");
    }
  };

  const handleReject = () => {
    const reason = prompt("Grund für Ablehnung:");
    if (reason) {
      try {
        updateErrorReportStatus(report.id, 'rejected', reason);
        toast.success("Fehlermeldung abgelehnt!");
        onStatusChange();
      } catch (error) {
        toast.error("Fehler beim Ablehnen!");
      }
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Fehlermeldung #{report.id}</CardTitle>
                <CardDescription>
                  Erstellt am {new Date(report.createdAt).toLocaleString('de-DE')}
                </CardDescription>
              </div>
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">Auftragsnummer</h3>
                <p className="text-sm">{report.orderNumber}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">AFO-Nummer</h3>
                <p className="text-sm">{report.afoNumber}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">Ersteller</h3>
                <p className="text-sm">{report.creator}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">Personalnummer</h3>
                <p className="text-sm">{report.personalNumber}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">Maschine</h3>
                <p className="text-sm">{report.machine}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-1">Fehlermenge</h3>
                <p className="text-sm">{report.defectiveQuantity} von {report.totalDefectiveQuantity}</p>
              </div>
              {report.assignedTeamLeader && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-1">Zugewiesener Teamleiter</h3>
                  <p className="text-sm">{report.assignedTeamLeader}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">Problembeschreibung</h3>
              <p className="text-sm bg-gray-50 p-3 rounded">{report.problemDescription}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">Fehlerursache</h3>
              <p className="text-sm bg-gray-50 p-3 rounded">{report.errorCause}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">Korrekturmaßnahme</h3>
              <p className="text-sm bg-gray-50 p-3 rounded">{report.correctiveAction}</p>
            </div>

            {report.rejectionReason && (
              <div>
                <h3 className="font-semibold text-sm text-red-600 mb-2">Ablehnungsgrund</h3>
                <p className="text-sm bg-red-50 p-3 rounded border border-red-200">{report.rejectionReason}</p>
              </div>
            )}

            {report.approvalStatus === 'pending' && (
              <div className="flex space-x-4 pt-4 border-t">
                <Button onClick={handleApprove} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Freigeben
                </Button>
                <Button onClick={handleReject} variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Ablehnen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorReportDetail;
