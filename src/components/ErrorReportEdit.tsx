import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, User, Calendar, Save, Search } from 'lucide-react';
import { ErrorReport, getErrorReports, updateErrorReportStatus } from '@/lib/storage';
import { getEmployees, getMachines } from '@/lib/settingsStorage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ErrorReportEditProps {
  report: ErrorReport;
  onBack: () => void;
  onSave: () => void;
  onViewReport?: (report: ErrorReport) => void;
}

const ErrorReportEdit = ({ report, onBack, onSave, onViewReport }: ErrorReportEditProps) => {
  const [formData, setFormData] = useState({
    problemDescription: report.problemDescription,
    correctiveAction: report.correctiveAction,
    defectiveQuantity: report.defectiveQuantity
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRelatedReports, setShowRelatedReports] = useState(false);
  const [showRelatedDialog, setShowRelatedDialog] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApprove = async () => {
    if (!isAuthenticated || !user) return;
    
    // First save changes
    if (!formData.problemDescription.trim() || !formData.correctiveAction.trim()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save changes and approve in one step
      const allReports = getErrorReports();
      const updatedReports = allReports.map(r => {
        if (r.id === report.id) {
          const employees = getEmployees();
          const currentEmployee = employees.find(emp => emp.account?.username === user.username);
          const approverName = currentEmployee?.name || user.username;
          
          return {
            ...r,
            problemDescription: formData.problemDescription,
            correctiveAction: formData.correctiveAction,
            defectiveQuantity: formData.defectiveQuantity,
            approvalStatus: 'approved' as const,
            approvedBy: approverName,
            approvedAt: new Date().toISOString(),
            rejectionReason: undefined,
            rejectedBy: undefined,
            rejectedAt: undefined,
          };
        }
        return r;
      });

      localStorage.setItem('production_error_reports', JSON.stringify(updatedReports));
      toast.success('Fehlermeldung wurde gespeichert und freigegeben!');
      onSave();
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
    
    // First save changes
    if (!formData.problemDescription.trim() || !formData.correctiveAction.trim()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Save changes and reject in one step
      const allReports = getErrorReports();
      const updatedReports = allReports.map(r => {
        if (r.id === report.id) {
          const employees = getEmployees();
          const currentEmployee = employees.find(emp => emp.account?.username === user.username);
          const rejectorName = currentEmployee?.name || user.username;
          
          return {
            ...r,
            problemDescription: formData.problemDescription,
            correctiveAction: formData.correctiveAction,
            defectiveQuantity: formData.defectiveQuantity,
            approvalStatus: 'rejected' as const,
            rejectionReason: rejectionReason,
            rejectedBy: rejectorName,
            rejectedAt: new Date().toISOString(),
            approvedBy: undefined,
            approvedAt: undefined,
          };
        }
        return r;
      });

      localStorage.setItem('production_error_reports', JSON.stringify(updatedReports));
      toast.success('Fehlermeldung wurde gespeichert und abgelehnt!');
      onSave();
      setShowRejectionForm(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Meldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!formData.problemDescription.trim()) {
      toast.error('Problembeschreibung darf nicht leer sein');
      return;
    }
    if (!formData.correctiveAction.trim()) {
      toast.error('Korrekturmaßnahme darf nicht leer sein');
      return;
    }

    setIsSubmitting(true);

    try {
      // Load all reports and update the corresponding one
      const allReports = getErrorReports();
      const updatedReports = allReports.map(r => {
        if (r.id === report.id) {
          return {
            ...r,
            problemDescription: formData.problemDescription,
            correctiveAction: formData.correctiveAction,
            defectiveQuantity: formData.defectiveQuantity,
            approvalStatus: 'pending' as const, // Reset status to pending if it was rejected
            rejectionReason: undefined, // Remove rejection reason
            rejectedBy: undefined, // Clear rejected by
            rejectedAt: undefined, // Clear rejected at
          };
        }
        return r;
      });

      // Save all reports back
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

  return (
    <div className="min-h-screen bg-light-blue p-4">
      <div className="mx-auto">
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
                <span>Fehlermeldung #{report.id} bearbeiten</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge()}
              </div>
            </CardTitle>
            <CardDescription>
              Erstellt am {formatDate(report.createdAt)} von {report.creator}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Rejection Information for rejected reports */}
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
                    <Label htmlFor="defectiveQuantity" className="text-sm text-gray-600">Fehlermenge:</Label>
                    <Input
                      id="defectiveQuantity"
                      type="number"
                      value={formData.defectiveQuantity}
                      onChange={(e) => handleInputChange('defectiveQuantity', parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
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

            {/* Editable Problem Description */}
            <div>
              <Label htmlFor="problemDescription" className="font-semibold text-gray-900 mb-2 block">
                Problembeschreibung *
              </Label>
              <Textarea
                id="problemDescription"
                value={formData.problemDescription}
                onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                className="min-h-[120px]"
                placeholder="Beschreiben Sie das Problem detailliert..."
              />
            </div>

            <Separator />

            {/* Editable Corrective Action */}
            <div>
              <Label htmlFor="correctiveAction" className="font-semibold text-gray-900 mb-2 block">
                Korrekturmaßnahme *
              </Label>
              <Textarea
                id="correctiveAction"
                value={formData.correctiveAction}
                onChange={(e) => handleInputChange('correctiveAction', e.target.value)}
                className="min-h-[120px]"
                placeholder="Beschreiben Sie die Korrekturmaßnahme detailliert..."
              />
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
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Ablehnungsgrund (erforderlich)
                        </Label>
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
              <DialogContent className="max-h-[80vh] overflow-y-auto">
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

export default ErrorReportEdit;