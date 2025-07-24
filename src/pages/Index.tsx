import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, FileText, Download, CheckCircle, Clock, Users, LogIn, LogOut, Edit, Search, Settings, Trash2, ArrowUpDown } from 'lucide-react';
import ErrorReportFormModern from '@/components/ErrorReportFormModern';
import ApprovalDashboard from '@/components/ApprovalDashboard';
import ExportSection from '@/components/ExportSection';
import LoginForm from '@/components/LoginForm';
import ErrorReportDetail from '@/components/ErrorReportDetail';
import ErrorReportEdit from '@/components/ErrorReportEdit';
import ReportAccessForm from '@/components/ReportAccessForm';
import SettingsPasswordPrompt from '@/components/SettingsPasswordPrompt';
import SettingsPasswordDialog from '@/components/SettingsPasswordDialog';
import SettingsModal from '@/components/SettingsModal';
import AdminDashboard from '@/components/AdminDashboard';
import DeputySelection from '@/components/DeputySelection';
import ErrorBoundary from '@/components/ErrorBoundary';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { ErrorReport, getErrorReports, getErrorReportsForTeamLeader, getErrorReportStatistics, getErrorReportsForDeputy, isUserDeputy, searchErrorReportsByOrderNumber, deleteErrorReport } from '@/lib/storage';
import { getEmployees } from '@/lib/settingsStorage';
import { toast } from "sonner";

const Index = () => {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettingsPrompt, setShowSettingsPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsPasswordDialog, setShowSettingsPasswordDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [editingReport, setEditingReport] = useState<ErrorReport | null>(null);
  const [refreshDepartments, setRefreshDepartments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'orderNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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

  // Filter and sort reports based on search term, status, and sort preferences
  const filteredReports = errorReports
    .filter(report => {
      const matchesSearch = searchTerm === '' || 
        report.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || report.approvalStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'orderNumber') {
        comparison = a.orderNumber.localeCompare(b.orderNumber);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
    setSelectedTab(null);
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
      // Teamleiter gehen direkt zur Bearbeitung
      if (user?.role === 'teamleader') {
        setEditingReport(report);
      } else {
        setSelectedReport(report);
      }
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

  const handleDeleteClick = (report: ErrorReport, e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindert das Auslösen des Zeilen-Klicks
    
    if (window.confirm(`Möchten Sie die Fehlermeldung #${report.id} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      try {
        deleteErrorReport(report.id);
        loadData();
        toast.success("Fehlermeldung erfolgreich gelöscht!");
      } catch (error) {
        toast.error("Fehler beim Löschen der Fehlermeldung");
      }
    }
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

  const handleToggleSort = (newSortBy: 'date' | 'orderNumber') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Calculate pending reports count for team leaders
  const pendingReportsCount = errorReports.filter(report => report.approvalStatus === 'pending').length;

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
      {/* Buttons fixed in top right corner */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
        {isAuthenticated && user ? (
          <>
            <Badge variant="default">
              {user.role === 'admin' ? 'Administrator' : user.role === 'teamleader' ? 'Teamleiter' : 'Mitarbeiter'}: {user.name}
            </Badge>
            {user.role === 'admin' && (
              <Button variant="outline" onClick={() => setShowSettingsPasswordDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Passwort ändern
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleLoginClick}>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hauptinhalt */}
        {isAuthenticated && user ? (
          user.role === 'admin' ? (
            // Admin Dashboard
            <AdminDashboard currentUser={user.username} />
          ) : (
          <div className="space-y-6">
            {/* Status-Anzeige für Teamleiter */}
            {user.role === 'teamleader' && pendingReportsCount > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-orange-900">
                        {pendingReportsCount} Fehlermeldung{pendingReportsCount !== 1 ? 'en' : ''} zur Prüfung
                      </h3>
                      <p className="text-sm text-orange-700">
                        {pendingReportsCount === 1 
                          ? 'Eine Fehlermeldung wartet auf Ihre Prüfung.'
                          : `${pendingReportsCount} Fehlermeldungen warten auf Ihre Prüfung.`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <div className="flex flex-col space-y-4 mt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Nach Auftragsnummer suchen..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="max-w-sm"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Status filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          <SelectItem value="pending">Zur Prüfung</SelectItem>
                          <SelectItem value="approved">Freigegeben</SelectItem>
                          <SelectItem value="rejected">Abgelehnt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Sortierungsoptionen */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Sortieren nach:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSort('date')}
                        className={sortBy === 'date' ? 'bg-gray-100' : ''}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-1" />
                        Datum {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSort('orderNumber')}
                        className={sortBy === 'orderNumber' ? 'bg-gray-100' : ''}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-1" />
                        Auftragsnummer {sortBy === 'orderNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm || statusFilter !== 'all' ? 'Keine Meldungen gefunden' : 
                       user.role === 'teamleader' ? 'Keine Meldungen zugewiesen' : 'Keine Vertretungsmeldungen'}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm || statusFilter !== 'all' ? 'Keine Meldungen entsprechen den aktuellen Filterkriterien.' :
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
                          {user.role === 'teamleader' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleDeleteClick(report, e)}
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )
        ) : selectedTab === 'new-report' ? (
          // Neue Meldung Formular
          <div className="space-y-4">
            <Button variant="outline" onClick={handleBackToOverview} className="mb-4">
              ← Zurück zur Startseite
            </Button>
            <ErrorReportFormModern onReportCreated={handleNewReport} refreshDepartments={refreshDepartments} />
          </div>
        ) : selectedTab === 'report-access' ? (
          // Meldung Suchen Formular
          <div className="space-y-4">
            <Button variant="outline" onClick={handleBackToOverview} className="mb-4">
              ← Zurück zur Startseite
            </Button>
            <ReportAccessForm onReportFound={handleReportFound} onBack={handleBackToOverview} />
          </div>
        ) : (
          // Start screen mit runden Buttons
          <div className="relative h-[calc(100vh-100px)] flex flex-col">
            {/* Neue Meldung Button - zentriert */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-6">
                <Button
                  onClick={() => setSelectedTab('new-report')}
                  size="lg"
                  variant="outline"
                  className="h-48 w-48 rounded-full p-0 bg-white border-2 border-gray-300 hover:bg-gray-50 animate-fade-in hover-scale"
                >
                  <Plus style={{ width: '128px', height: '128px' }} strokeWidth={1} className="text-gray-700" />
                </Button>
                <span className="text-3xl font-medium text-gray-700">Neue Meldung</span>
              </div>
            </div>

            {/* Meldung Suchen Button - am unteren Rand */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex flex-col items-center space-y-3">
                <Button
                  onClick={() => setSelectedTab('report-access')}
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 rounded-full p-0 hover-scale"
                >
                  <Search className="h-6 w-6" />
                </Button>
                <span className="text-sm font-medium text-gray-600">Meldung Suchen</span>
              </div>
            </div>
          </div>
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

      {/* Settings Password Dialog for Admins */}
      <SettingsPasswordDialog
        isOpen={showSettingsPasswordDialog}
        onClose={() => setShowSettingsPasswordDialog(false)}
      />

      {/* Logo Component - Fixed to bottom right */}
      <Logo />
    </div>
  );
};

export default Index;
