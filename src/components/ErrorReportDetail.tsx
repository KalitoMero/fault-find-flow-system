import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Trash2, AlertTriangle, User, Calendar, Edit, Printer, Search } from 'lucide-react';
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
  onViewReport?: (report: ErrorReport) => void;
  backButtonText?: string;
}

const ErrorReportDetail = ({ report, onBack, onStatusChange, onEdit, onViewReport, backButtonText = "Zurück zur Übersicht" }: ErrorReportDetailProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRelatedDialog, setShowRelatedDialog] = useState(false);
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

  const getRelatedReports = () => {
    if (!report.additionalExcelData?.Artikelnummer) return [];
    
    const allReports = getErrorReports();
    const relatedReports = allReports.filter(r => 
      String(r.id) !== String(report.id) && 
      r.additionalExcelData?.Artikelnummer === report.additionalExcelData.Artikelnummer
    );
    
    console.log('Current report ID:', report.id);
    console.log('Related reports found:', relatedReports.map(r => r.id));
    
    return relatedReports;
  };

  const handleShowRelatedReports = () => {
    const related = getRelatedReports();
    if (related.length === 0) {
      toast.success('Es gibt keine anderen Fehlermeldungen mit dieser Artikelnummer.');
      return;
    }
    console.log('Opening related reports dialog');
    setShowRelatedDialog(true);
  };

  const handleViewRelatedReport = (relatedReport: ErrorReport) => {
    console.log('Viewing related report:', relatedReport.id);
    console.log('Current report ID:', report.id);
    
    if (String(relatedReport.id) === String(report.id)) {
      console.log('Same report clicked, ignoring');
      toast.success('Diese Fehlermeldung wird bereits angezeigt');
      return;
    }
    
    setShowRelatedDialog(false);
    if (onViewReport) {
      console.log('Calling onViewReport with report:', relatedReport.id);
      onViewReport(relatedReport);
    } else {
      console.log('onViewReport callback is not provided');
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
  
  // Hole Ressource-Daten aus additionalExcelData oder machine field
  const resourceValue = report.additionalExcelData?.Ressource || machineName || report.machine;

  return (
    <div className="min-h-screen bg-light-blue p-4">
      <div className="max-w-full mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backButtonText}
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
                {/* Edit Button nur für abgelehnte Meldungen */}
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
                  <div>
                    <span className="text-sm text-gray-600">Abteilung:</span>
                    <p className="font-medium">{report.excelDepartment || 'Nicht angegeben'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mengenangaben</h3>
                <div className="space-y-2">
                   <div>
                     <span className="text-sm text-gray-600">Fehlermenge:</span>
                     <p className="font-medium">{report.defectiveQuantity}</p>
                   </div>
                  <div>
                    <span className="text-sm text-gray-600">Ersteller:</span>
                    <p className="font-medium">{report.creator}</p>
                  </div>
                  {report.additionalExcelData?.Artikelnummer && (
                    <div>
                      <span className="text-sm text-gray-600">Artikelnummer:</span>
                      <p className="font-medium">{report.additionalExcelData.Artikelnummer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zusätzliche Excel-Informationen */}
            {report.additionalExcelData && Object.keys(report.additionalExcelData).filter(key => key !== 'Artikelnummer').length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Zusätzliche Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(report.additionalExcelData)
                      .filter(([key]) => key !== 'Artikelnummer')
                      .map(([key, value]) => (
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

            {/* Button für verwandte Fehlermeldungen - für alle Benutzer bei allen Meldungen */}
            {report.additionalExcelData?.Artikelnummer && (
              <>
                <Separator />
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleShowRelatedReports}
                    className="min-w-[200px]"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Weitere Fehlermeldungen mit gleicher Artikelnummer
                  </Button>
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
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Ablehnen
                      </Button>
                      {report.additionalExcelData?.Artikelnummer && (
                        <Button
                          variant="outline"
                          onClick={handleShowRelatedReports}
                          disabled={isSubmitting}
                          className="min-w-[200px]"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Weitere Fehlermeldungen mit gleicher Artikelnummer
                        </Button>
                      )}
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

            {/* Dialog für weitere Fehlermeldungen */}
            <Dialog open={showRelatedDialog} onOpenChange={setShowRelatedDialog}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Weitere Fehlermeldungen mit Artikelnummer {report.additionalExcelData?.Artikelnummer}
                  </DialogTitle>
                  <DialogDescription>
                    Klicken Sie auf eine Fehlermeldung, um sie zu öffnen.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {(() => {
                    const relatedReports = getRelatedReports();
                    return relatedReports.length > 0 ? (
                      <div className="space-y-3">
                        {relatedReports.map((relatedReport) => (
                          <div 
                            key={relatedReport.id} 
                            className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => handleViewRelatedReport(relatedReport)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-lg">Fehlermeldung #{relatedReport.id}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Erstellt am {formatDate(relatedReport.createdAt)} von {relatedReport.creator}
                                </div>
                                <div className="text-sm text-gray-600">
                                  AFO: {relatedReport.afoNumber} | Auftrag: {relatedReport.orderNumber}
                                </div>
                                <div className="text-sm text-gray-700 mt-2">
                                  <strong>Problem:</strong> {relatedReport.problemDescription.substring(0, 150)}
                                  {relatedReport.problemDescription.length > 150 && '...'}
                                </div>
                              </div>
                              <div className="ml-4">
                                {relatedReport.approvalStatus === 'approved' && (
                                  <Badge className="bg-green-100 text-green-800">Freigegeben</Badge>
                                )}
                                {relatedReport.approvalStatus === 'rejected' && (
                                  <Badge variant="destructive">Abgelehnt</Badge>
                                )}
                                {relatedReport.approvalStatus === 'pending' && (
                                  <Badge variant="secondary">Zur Prüfung</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-600 text-center py-8">
                        Keine weiteren Fehlermeldungen mit dieser Artikelnummer gefunden.
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorReportDetail;
