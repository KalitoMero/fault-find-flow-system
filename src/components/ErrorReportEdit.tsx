import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Edit3, Package, Hash, User, FileText, Settings, Home, XCircle } from 'lucide-react';
import { ErrorReport, getErrorReports, updateErrorReportStatus } from '@/lib/storage';
import { getEmployees } from '@/lib/settingsStorage';
import { getMachines } from '@/lib/settingsStorage';
import AudioRecorderSimple from './AudioRecorderSimple';
import TouchKeypad from './TouchKeypad';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ErrorReportEditProps {
  report: ErrorReport;
  onBack: () => void;
  onSave: () => void;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'textarea';
  required: boolean;
  completed: boolean;
  icon: React.ReactNode;
  placeholder: string;
  readonly?: boolean;
}

const ErrorReportEdit = ({ report, onBack, onSave }: ErrorReportEditProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [originalStep, setOriginalStep] = useState(0);
  const [employees, setEmployees] = useState(getEmployees());
  const [audioFiles, setAudioFiles] = useState<{
    problemDescription?: string;
    correctiveAction?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  // Get machine name for display
  const machines = getMachines();
  const machine = machines.find(m => m.id === report.machine);
  const machineName = machine ? machine.name : report.machine || 'Nicht angegeben';

  const [fields, setFields] = useState<FormField[]>([
    {
      id: 'orderNumber',
      label: 'Auftragsnummer',
      value: report.orderNumber,
      type: 'text',
      required: true,
      completed: true,
      readonly: true,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. AUF-2024-001'
    },
    {
      id: 'afoNumber',
      label: 'AFO-Nummer',
      value: report.afoNumber || '',
      type: 'text',
      required: false,
      completed: true,
      readonly: true,
      icon: <Hash className="h-4 w-4" />,
      placeholder: 'z.B. AFO-12345'
    },
    {
      id: 'personalNumber',
      label: 'Personalnummer',
      value: report.personalNumber || report.creator,
      type: 'text',
      required: true,
      completed: true,
      readonly: true,
      icon: <User className="h-4 w-4" />,
      placeholder: 'Personalnummer'
    },
    {
      id: 'defectiveQuantity',
      label: 'Fehlermenge',
      value: report.defectiveQuantity.toString(),
      type: 'text',
      required: true,
      completed: true,
      readonly: true,
      icon: <Package className="h-4 w-4" />,
      placeholder: 'Anzahl'
    },
    {
      id: 'machine',
      label: 'Ressource',
      value: machineName,
      type: 'text',
      required: false,
      completed: true,
      readonly: true,
      icon: <Settings className="h-4 w-4" />,
      placeholder: 'Maschine/Arbeitsplatz'
    },
    {
      id: 'problemDescription',
      label: 'Problembeschreibung',
      value: report.problemDescription,
      type: 'textarea',
      required: true,
      completed: !!report.problemDescription,
      icon: <FileText className="h-4 w-4" />,
      placeholder: 'Beschreiben Sie das Problem...'
    },
    {
      id: 'correctiveAction',
      label: 'Korrekturmaßnahme',
      value: report.correctiveAction,
      type: 'textarea',
      required: true,
      completed: !!report.correctiveAction,
      icon: <Settings className="h-4 w-4" />,
      placeholder: 'Beschreiben Sie die Korrekturmaßnahme...'
    }
  ]);

  // Helper function to get team leader display name
  const getTeamLeaderDisplayName = (username: string): string => {
    const employee = employees.find(emp => emp.account?.username === username);
    return employee ? employee.name : username;
  };

  const handleFieldUpdate = (fieldId: string, value: string) => {
    setFields(prev => prev.map(field => {
      if (field.id === fieldId) {
        return { ...field, value, completed: value.length > 0 };
      }
      return field;
    }));
  };

  const handleNext = () => {
    const currentField = fields[currentStep];
    if (currentField.required && !currentField.value) {
      toast.error(`${currentField.label} ist ein Pflichtfeld`);
      return;
    }

    setFields(prev => prev.map((field, index) => 
      index === currentStep ? { ...field, completed: true } : field
    ));

    // Return to original step or go to next step
    if (originalStep > currentStep && originalStep < fields.length) {
      setCurrentStep(originalStep);
      setOriginalStep(0); // Reset original step
    } else if (currentStep < fields.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFieldClick = (index: number) => {
    const field = fields[index];
    if (field.completed && !field.readonly) {
      setOriginalStep(currentStep); // Remember where we came from
      setCurrentStep(index);
    }
  };

  const handleKeypadInput = (value: string) => {
    const currentField = fields[currentStep];
    if (currentField.readonly) return;
    
    // Allow decimal point only for order number field
    if (value === '.' && currentField.id !== 'orderNumber') {
      return;
    }
    
    handleFieldUpdate(currentField.id, currentField.value + value);
  };

  const handleKeypadBackspace = () => {
    const currentField = fields[currentStep];
    if (currentField.readonly) return;
    handleFieldUpdate(currentField.id, currentField.value.slice(0, -1));
  };

  const handleApprove = async () => {
    if (!isAuthenticated || !user) return;
    
    setIsSubmitting(true);
    try {
      // Find the current user's employee record to get their name
      const currentEmployee = employees.find(emp => emp.account?.username === user.username);
      const approverName = currentEmployee?.name || user.username;
      
      updateErrorReportStatus(report.id, 'approved', undefined, approverName);
      toast.success('Fehlermeldung wurde freigegeben!');
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
    
    setIsSubmitting(true);
    try {
      // Find the current user's employee record to get their name
      const currentEmployee = employees.find(emp => emp.account?.username === user.username);
      const rejectorName = currentEmployee?.name || user.username;
      
      updateErrorReportStatus(report.id, 'rejected', rejectionReason, rejectorName);
      toast.success('Fehlermeldung wurde abgelehnt!');
      onSave();
      setShowRejectionForm(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Meldung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !f.value);
    
    if (missingFields.length > 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
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
            problemDescription: fields.find(f => f.id === 'problemDescription')?.value || '',
            correctiveAction: fields.find(f => f.id === 'correctiveAction')?.value || '',
            approvalStatus: 'pending' as const, // Reset status to pending
            rejectionReason: undefined, // Remove rejection reason
            rejectedBy: undefined, // Clear rejected by
            rejectedAt: undefined, // Clear rejected at
            audioFiles: Object.keys(audioFiles).length > 0 ? audioFiles : r.audioFiles
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

  const currentField = fields[currentStep];
  const completedFields = fields.filter(f => f.completed && f.id !== currentField.id);
  const isLastStep = currentStep === fields.length - 1;
  const editableFields = fields.filter(f => !f.readonly);
  const isOnEditableField = editableFields.some(f => f.id === currentField.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Back to Home Button - Fixed top left */}
      <div className="fixed top-4 left-4 z-10">
        <Button 
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Zurück zur Übersicht
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">

        {/* Rejection Reason Display */}
        {report.approvalStatus === 'rejected' && report.rejectionReason && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Grund für Ablehnung:</h3>
              </div>
              <p className="text-red-700">{report.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        {/* Excel Department and Team Leader Info */}
        {(report.excelDepartment || report.assignedTeamLeader !== 'System') && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  {report.excelDepartment && (
                    <div>
                      <span className="text-blue-600">Abteilung:</span> <span className="font-medium">{report.excelDepartment}</span>
                    </div>
                  )}
                  {report.assignedTeamLeader !== 'System' && (
                    <div>
                      <span className="text-blue-600">Teamleiter:</span> <span className="font-medium">{getTeamLeaderDisplayName(report.assignedTeamLeader)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Fields */}
        {completedFields.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                
                {/* Number fields in a row - 5 columns for readonly fields */}
                <div className="grid grid-cols-5 gap-3">
                  {completedFields.filter(f => f.type !== 'textarea').map((field) => (
                    <div
                      key={field.id}
                      onClick={() => !field.readonly && handleFieldClick(fields.findIndex(f => f.id === field.id))}
                      className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                        field.readonly 
                          ? 'bg-gray-50 border-gray-200 cursor-default' 
                          : 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100'
                      }`}
                    >
                      {field.icon}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${field.readonly ? 'text-gray-600' : 'text-green-800'}`}>
                          {field.label}
                        </p>
                        <p className={`text-sm truncate ${field.readonly ? 'text-gray-700' : 'text-green-600'}`}>
                          {field.value}
                        </p>
                      </div>
                      {!field.readonly && <Edit3 className="h-3 w-3 text-green-600" />}
                    </div>
                  ))}
                </div>
                
                {/* Text areas full width */}
                {completedFields.filter(f => f.type === 'textarea').map((field) => (
                  <div
                    key={field.id}
                    onClick={() => handleFieldClick(fields.findIndex(f => f.id === field.id))}
                    className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  >
                    {field.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">{field.label}</p>
                      <div className="text-sm text-green-600">
                        <p className="whitespace-pre-wrap break-words">{field.value}</p>
                      </div>
                    </div>
                    <Edit3 className="h-4 w-4 text-green-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Field */}
        <Card className="bg-white shadow-xl min-h-[600px] flex flex-col justify-center">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl flex items-center justify-center gap-3">
              {currentField.icon}
              {currentField.label}
              {currentField.required && <span className="text-red-500">*</span>}
              {currentField.readonly && <span className="text-gray-500 text-sm">(schreibgeschützt)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center space-y-4">
              {currentField.type === 'textarea' ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="flex gap-2 items-start">
                    <Textarea
                      value={currentField.value}
                      onChange={(e) => !currentField.readonly && handleFieldUpdate(currentField.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && currentField.value.trim()) {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      placeholder={currentField.placeholder}
                      rows={4}
                      className="text-center text-lg flex-1"
                      disabled={currentField.readonly}
                    />
                    {!currentField.readonly && (currentField.id === 'problemDescription' || currentField.id === 'correctiveAction') && (
                      <AudioRecorderSimple 
                        onTranscription={(transcription, audioBlob) => {
                          handleFieldUpdate(currentField.id, transcription);
                          setAudioFiles(prev => ({...prev, [currentField.id]: audioBlob}));
                        }}
                        label={`${currentField.label} aufnehmen`}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Input
                    type="text"
                    value={currentField.value}
                    onChange={(e) => !currentField.readonly && handleFieldUpdate(currentField.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentField.value.trim()) {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    placeholder={currentField.placeholder}
                    className="text-center text-xl max-w-md h-14"
                    disabled={currentField.readonly}
                  />
                  
                  {/* Touch Keypad - Only for editable non-textarea fields */}
                  {!currentField.readonly && (
                    <TouchKeypad
                      onInput={handleKeypadInput}
                      onBackspace={handleKeypadBackspace}
                      allowDecimal={currentField.id === 'orderNumber'}
                      className="mt-4"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-6">
              {isLastStep ? (
                <div className="flex flex-col gap-4 items-center">
                  {/* Save Changes Button */}
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Settings className="h-5 w-5 mr-2 animate-spin" />
                        Wird gespeichert...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Änderungen speichern
                      </>
                    )}
                  </Button>

                  {/* Approval Actions for Team Leaders */}
                  {isAuthenticated && report.approvalStatus === 'pending' && (
                    <div className="space-y-4 w-full max-w-md">
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 mb-4">Freigabe-Entscheidung</h3>
                        
                        {!showRejectionForm ? (
                          <div className="flex gap-4 justify-center">
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
                            <div className="flex gap-4 justify-center">
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
                    </div>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="px-8 py-3 text-lg"
                  size="lg"
                  disabled={currentField.readonly}
                >
                  {currentField.readonly ? 'Weiter (schreibgeschützt)' : 'Weiter'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorReportEdit;