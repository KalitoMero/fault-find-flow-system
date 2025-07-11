import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, FileText, Download, CheckCircle, Clock, Users, LogIn, LogOut, Edit, Search, Settings } from 'lucide-react';
import ErrorReportForm from '@/components/ErrorReportForm';
import ApprovalDashboard from '@/components/ApprovalDashboard';
import ExportSection from '@/components/ExportSection';
import LoginForm from '@/components/LoginForm';
import ErrorReportDetail from '@/components/ErrorReportDetail';
import ErrorReportEdit from '@/components/ErrorReportEdit';
import ReportAccessForm from '@/components/ReportAccessForm';
import SettingsPasswordPrompt from '@/components/SettingsPasswordPrompt';
import SettingsModal from '@/components/SettingsModal';
import DeputySelection from '@/components/DeputySelection';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { ErrorReport, getErrorReports, getErrorReportsForTeamLeader, getErrorReportStatistics, getErrorReportsForDeputy, isUserDeputy, searchErrorReportsByOrderNumber } from '@/lib/storage';
import { getEmployees } from '@/lib/settingsStorage';
import { toast } from "sonner";

const Index = () => {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettingsPrompt, setShowSettingsPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [editingReport, setEditingReport] = useState<ErrorReport | null>(null);
  const [refreshDepartments, setRefreshDepartments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, logout, isAuthenticated } = useAuth();

  const loadData = () => {
    if (isAuthenticated && user) {
      if (user.role === 'teamleader') {
        // Teamleiter sieht seine zugewiesenen Meldungen + Meldungen als Vertretung
        const directReports = getErrorReportsForTeamLeader(user.username);
        const deputyReports = getErrorReportsForDeputy(user.username);
        
        // Kombiniere beide Listen und entferne Duplikate
        const allReports = [...directReports];
        deputyReports.forEach(deputyReport => {
          if (!allReports.find(report => report.id === deputyReport.id)) {
            allReports.push(deputyReport);
          }
        });
        
        setErrorReports(allReports);
      } else {
        // Normale Mitarbeiter sehen nur Meldungen als Vertretung
        const deputyReports = getErrorReportsForDeputy(user.username);
        setErrorReports(deputyReports);
      }
    } else {
      // Nicht angemeldete Benutzer sehen alle Meldungen
      const reports = getErrorReports();
      setErrorReports(reports);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Filter reports based on search term
  const filteredReports = searchTerm 
    ? errorReports.filter(report => 
        report.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : errorReports;

  const handleNewReport = () => {
    loadData();
    toast.success("Fehlermeldung erfolgreich erstellt!");
  };

  const handleApprovalChange = () => {
    loadData();
    toast.success("Freigabestatus aktualisiert!");
  };

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleBackToOverview = () => {
    setShowLogin(false);
    setSelectedReport(null);
    setEditingReport(null);
  };

  const handleLogout = () => {
    logout();
    toast.success("Erfolgreich abgemeldet!");
  };

  const handleSettingsClick = () => {
    setShowSettingsPrompt(true);
  };

  const handleSettingsPasswordSuccess = () => {
    setShowSettingsPrompt(false);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    // Trigger department refresh in ErrorReportForm
    setRefreshDepartments(prev => !prev);
  };

  const handleReportClick = (report: ErrorReport) => {
    if (isAuthenticated) {
      setSelectedReport(report);
    } else {
      // Für Mitarbeiter: nur freigegebene Meldungen anklickbar
      if (report.approvalStatus === 'approved') {
        setSelectedReport(report);
      } else if (report.approvalStatus === 'pending') {
        toast.info("Diese Meldung ist noch zur Prüfung und kann nicht geöffnet werden");
      }
    }
  };

  const handleEditClick = (report: ErrorReport, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Verhindert das Auslösen des Zeilen-Klicks
    }
    setEditingReport(report);
  };

  const handleEditSave = () => {
    loadData();
    setEditingReport(null);
    toast.success("Fehlermeldung erfolgreich aktualisiert!");
  };

  const handleReportFound = (report: ErrorReport) => {
    setSelectedReport(report);
  };

  // Prüfe ob Vertretungsfeld angezeigt werden soll
  const shouldShowDeputySelection = () => {
    if (!isAuthenticated || !user) return false;
    
    // Zeige für Teamleiter
    if (user.role === 'teamleader') return true;
    
    // Zeige für normale Mitarbeiter nur wenn sie bereits als Vertretung eingetragen sind
    return isUserDeputy(user.username);
  };

  // Zeige Login-Formular
  if (showLogin && !isAuthenticated) {
    return <LoginForm onBack={handleBackToOverview} />;
  }

  // Zeige Bearbeitungs-Formular
  if (editingReport) {
    return (
      <ErrorReportEdit
        report={editingReport}
        onBack={handleBackToOverview}
        onSave={handleEditSave}
      />
    );
  }

  // Zeige Detailansicht
  if (selectedReport && (isAuthenticated || selectedReport.approvalStatus === 'approved')) {
    return (
      <ErrorReportDetail
        report={selectedReport}
        onBack={handleBackToOverview}
        onStatusChange={handleApprovalChange}
        onEdit={handleEditClick}
      />
    );
  }

  const stats = getErrorReportStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Produktions-Fehlermeldungen</h1>
                <p className="text-sm text-gray-500">Qualitätsmanagement System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <Badge variant="default">
                    {user.role === 'teamleader' ? 'Teamleiter' : 'Mitarbeiter'}: {user.name}
                  </Badge>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </Button>
                  <Button onClick={handleLoginClick}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hauptinhalt */}
        {isAuthenticated && user ? (
          // Dashboard für alle angemeldeten Benutzer (Teamleiter und Mitarbeiter)
          <div className="space-y-6">
            {/* Deputy Selection with Error Boundary - nur anzeigen wenn berechtigt */}
            <ErrorBoundary>
              <DeputySelection 
                currentUser={user?.username || ''} 
                shouldShow={shouldShowDeputySelection()}
              />
            </ErrorBoundary>
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {user.role === 'teamleader' ? 'Meine Fehlermeldungen' : 'Vertretungs-Fehlermeldungen'}
                </CardTitle>
                <CardDescription>
                  {user.role === 'teamleader' 
                    ? 'Fehlermeldungen, die Ihnen zur Prüfung zugewiesen sind (inkl. Vertretungsmeldungen, sortiert nach Datum)'
                    : 'Fehlermeldungen, für die Sie als Vertretung eingetragen sind'
                  }
                </CardDescription>
                {user.role === 'teamleader' && (
                  <div className="flex items-center space-x-2 mt-4">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Nach Auftragsnummer suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'Keine Meldungen gefunden' : 
                       user.role === 'teamleader' ? 'Keine Meldungen zugewiesen' : 'Keine Vertretungsmeldungen'}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm ? `Keine Meldungen mit der Auftragsnummer "${searchTerm}" gefunden.` :
                       user.role === 'teamleader' 
                        ? 'Es sind Ihnen aktuell keine Fehlermeldungen zur Prüfung zugewiesen.'
                        : 'Sie sind aktuell für keine Fehlermeldungen als Vertretung eingetragen.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleReportClick(report)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline">#{report.id}</Badge>
                            <span className="font-medium">Auftrag: {report.orderNumber}</span>
                            <span className="text-gray-500">AFO: {report.afoNumber}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Erstellt von {report.creator} am {new Date(report.createdAt).toLocaleDateString('de-DE')}
                          </p>
                          <p className="text-sm text-gray-800 mt-1 truncate max-w-md">
                            {report.problemDescription.slice(0, 100)}...
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              report.approvalStatus === 'approved' ? 'default' :
                              report.approvalStatus === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {report.approvalStatus === 'approved' ? 'Freigegeben' :
                             report.approvalStatus === 'rejected' ? 'Abgelehnt' : 'Prüfung'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Mitarbeiter-Dashboard (Tabs mit Meldung Einsehen statt Dashboard)
          <Tabs defaultValue="report-access" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="report-access" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Meldung Einsehen</span>
              </TabsTrigger>
              <TabsTrigger value="new-report" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Neue Meldung</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report-access" className="space-y-6">
              <ReportAccessForm onReportFound={handleReportFound} onBack={handleBackToOverview} />
            </TabsContent>

            <TabsContent value="new-report">
              <ErrorReportForm onReportCreated={handleNewReport} refreshDepartments={refreshDepartments} />
            </TabsContent>

            <TabsContent value="export">
              <ExportSection reports={errorReports} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Settings Password Prompt */}
      <SettingsPasswordPrompt
        isOpen={showSettingsPrompt}
        onClose={() => setShowSettingsPrompt(false)}
        onSuccess={handleSettingsPasswordSuccess}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={handleSettingsClose}
      />
    </div>
  );
};

export default Index;
