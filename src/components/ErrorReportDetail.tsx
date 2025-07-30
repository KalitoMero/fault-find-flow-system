import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, XCircle, Trash2, AlertTriangle, User, Calendar, Edit, Printer } from 'lucide-react';
import { ErrorReport, updateErrorReportStatus, getErrorReports } from '@/lib/storage';
import { getEmployees, getMachines } from '@/lib/settingsStorage';
import { useAuth } from '@/hooks/useAuth';
import { printErrorReport } from '@/lib/printUtils';
import { toast } from "sonner";

interface ErrorReportDetailProps {
  report: ErrorReport;
  onBack: () => void;
  onStatusChange: () => void;
  onEdit?: (report: ErrorReport) => void;
}

const ErrorReportDetail = ({ report, onBack, onStatusChange, onEdit }: ErrorReportDetailProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleApprove = async () => {
    if (!isAuthenticated || !user) return;
    
    setIsSubmitting(true);
    try {
      // Find the current user's employee record to get their name
      const employees = getEmployees();
      const currentEmployee = employees.find(emp => emp.account?.username === user.username);
      const approverName = currentEmployee?.name || user.username;
      
      updateErrorReportStatus(report.id, 'approved', undefined, approverName);
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
      // Find the current user's employee record to get their name
      const employees = getEmployees();
      const currentEmployee = employees.find(emp => emp.account?.username === user.username);
      const rejectorName = currentEmployee?.name || user.username;
      
      updateErrorReportStatus(report.id, 'rejected', rejectionReason, rejectorName);
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

  const handleEdit = () => {
    if (onEdit) {
      onEdit(report);
    }
  };

  const handlePrint = () => {
    printErrorReport(report);
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

  // Hole den Namen des Freigabenden/Ablehnenden
  const employees = getEmployees();
  const getEmployeeName = (username: string) => {
    const employee = employees.find(emp => emp.account?.username === username);
    return employee ? employee.name : username;
  };

  const approvedByName = report.approvedBy ? getEmployeeName(report.approvedBy) : report.approvedBy;
  const rejectedByName = report.rejectedBy ? getEmployeeName(report.rejectedBy) : report.rejectedBy;

  // Hole den richtigen Feststellort-Namen
  const machines = getMachines();
  const machine = machines.find(m => m.id === report.machine);
  const machineName = machine ? machine.name : report.machine;

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Drucken
                </Button>
                {/* Edit Button für abgelehnte Meldungen */}
                {report.approvalStatus === 'rejected' && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                )}
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
            {/* Approval Information for approved reports */}
            {report.approvalStatus === 'approved' && approvedByName && report.approvedAt && (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Freigabe-Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-sm text-green-700">Freigegeben von:</span>
                        <p className="font-medium text-green-800">{approvedByName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-sm text-green-700">Freigegeben am:</span>
                        <p className="font-medium text-green-800">{formatDate(report.approvedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {report.approvalStatus === 'rejected' && rejectedByName && report.rejectedAt && (
              <>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Ablehnungs-Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-red-600" />
                      <div>
                        <span className="text-sm text-red-700">Abgelehnt von:</span>
                        <p className="font-medium text-red-800">{rejectedByName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <div>
                        <span className="text-sm text-red-700">Abgelehnt am:</span>
                        <p className="font-medium text-red-800">{formatDate(report.rejectedAt)}</p>
                      </div>
                    </div>
                  </div>
                  {report.rejectionReason && (
                    <div>
                      <span className="text-sm text-red-700 font-medium">Ablehnungsgrund:</span>
                      <p className="text-red-800 mt-1">{report.rejectionReason}</p>
                    </div>
                  )}
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
                  {report.excelDepartment && (
                    <div>
                      <span className="text-sm text-gray-600">Abteilung:</span>
                      <p className="font-medium">{report.excelDepartment}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mengenangaben</h3>
                <div className="space-y-2">
                   <div>
                     <span className="text-sm text-gray-600">Menge:</span>
                     <p className="font-medium">{report.defectiveQuantity}</p>
                   </div>
                  <div>
                    <span className="text-sm text-gray-600">Ersteller:</span>
                    <p className="font-medium">{report.creator}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zusätzliche Excel-Informationen */}
            {report.additionalExcelData && Object.keys(report.additionalExcelData).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Zusätzliche Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(report.additionalExcelData).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-sm text-gray-600">{key}:</span>
                        <p className="font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Problembeschreibung</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{report.problemDescription}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Korrekturmaßnahme</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{report.correctiveAction}</p>
              </div>
            </div>

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
