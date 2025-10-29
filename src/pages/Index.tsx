import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, FileText, Download, CheckCircle, Clock, Users, LogIn, LogOut, Edit, Search, Settings, Trash2, ArrowUpDown, LayoutDashboard } from 'lucide-react';
import ErrorReportFormModern from '@/components/ErrorReportFormModern';
import StepByStepForm from '@/components/StepByStepForm';
import ApprovalDashboard from '@/components/ApprovalDashboard';
import ExportSection from '@/components/ExportSection';
import LoginForm from '@/components/LoginForm';
import ErrorReportDetail from '@/components/ErrorReportDetail';
import ErrorReportEdit from '@/components/ErrorReportEdit';
import ReportAccessForm from '@/components/ReportAccessForm';
import SettingsModal from '@/components/SettingsModal';
import AdminAuthDialog from '@/components/AdminAuthDialog';
import AdminDashboard from '@/components/AdminDashboard';
import DeputySelection from '@/components/DeputySelection';
import ErrorBoundary from '@/components/ErrorBoundary';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ErrorReport, getErrorReports, getErrorReportsForTeamLeader, getErrorReportStatistics, getErrorReportsForDeputy, isUserDeputy, searchErrorReportsByOrderNumber, deleteErrorReport } from '@/lib/storage';
import { getEmployees } from '@/lib/settingsStorage';
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [editingReport, setEditingReport] = useState<ErrorReport | null>(null);
  const [viewHistory, setViewHistory] = useState<ErrorReport[]>([]);
  const [refreshDepartments, setRefreshDepartments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'orderNumber' | 'articleNumber'>('orderNumber');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'orderNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStepForm, setShowStepForm] = useState(false);
  const [shouldShowDeputy, setShouldShowDeputy] = useState(false);
  const { profile, logout, isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    const checkDeputy = async () => {
      if (profile?.id) {
        const hasRole = await isUserDeputy(profile.id);
        setShouldShowDeputy(hasRole);
      }
    };
    checkDeputy();
  }, [profile?.id]);

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      if (profile && (profile.role === 'teamleader' || profile.role === 'admin')) {
        let reports: ErrorReport[] = [];
        
        if (profile.role === 'admin') {
          reports = await getErrorReports();
        } else if (profile.role === 'teamleader') {
          reports = await getErrorReportsForTeamLeader(profile.id);
          
          // Check if user is also a deputy
          const isDeputy = await isUserDeputy(profile.id);
          if (isDeputy) {
            const deputyReports = await getErrorReportsForDeputy(profile.id);
            // Merge and remove duplicates
            const allReports = [...reports, ...deputyReports];
            reports = allReports.filter((report, index, self) =>
              index === self.findIndex((r) => r.id === report.id)
            );
          }
        }
        
        setErrorReports(reports);
      } else {
        setErrorReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setErrorReports([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, profile]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  // Filter and sort reports based on search term, status, and sort preferences
  const filteredReports = errorReports
    .filter(report => {
      let matchesSearch = searchTerm === '';
      
      if (searchTerm !== '') {
        if (searchType === 'orderNumber') {
          matchesSearch = report.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (searchType === 'articleNumber') {
          // Search in Excel data for article number
          const additionalData = report.additionalExcelData || {};
          const articleNumber = additionalData['Artikelnummer'] || '';
          matchesSearch = articleNumber.toLowerCase().includes(searchTerm.toLowerCase());
        }
      }
      
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

  const handleCreateReport = () => {
    setShowStepForm(true);
  };

  const handleNewReport = () => {
    loadData();
    setShowStepForm(false);
    toast.success("Fehlermeldung erfolgreich erstellt!");
  };

  const handleApprovalChange = async () => {
    loadData();
    // Aktualisiere selectedReport mit den neuesten Daten
    if (selectedReport) {
      const updatedReports = await getErrorReports();
      const updatedSelectedReport = updatedReports.find(r => r.id === selectedReport.id);
      if (updatedSelectedReport) {
        setSelectedReport(updatedSelectedReport);
      }
    }
    toast.success("Freigabestatus aktualisiert!");
  };

  const handleViewRelatedReport = (report: ErrorReport) => {
    console.log('Index: handleViewRelatedReport called with report:', report.id);
    console.log('Index: Current selectedReport:', selectedReport?.id);
    
    // Simply navigate to the related report without adding to history
    // Related reports are not hierarchical drilldowns, they're equivalent reports
    console.log('Index: Setting new selectedReport:', report.id);
    setSelectedReport(report);
    setEditingReport(null); // Clear any editing state
  };

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleBackToOverview = () => {
    console.log('Index: handleBackToOverview called');
    console.log('Index: Current viewHistory length:', viewHistory.length);
    
    if (viewHistory.length > 0) {
      // Go back to previous report
      const previousReport = viewHistory[viewHistory.length - 1];
      console.log('Index: Going back to previous report:', previousReport.id);
      setViewHistory(prev => prev.slice(0, -1));
      setSelectedReport(previousReport);
    } else {
      // Go back to overview
      console.log('Index: Going back to overview');
      setShowLogin(false);
      setSelectedReport(null);
      setEditingReport(null);
      setSelectedTab(null);
      setViewHistory([]);
      loadData();
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Erfolgreich abgemeldet!");
  };

  const handleSettingsClick = () => {
    setShowAdminAuth(true);
  };

  const handleAdminAuthSuccess = () => {
    setShowAdminAuth(false);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    // Trigger department refresh in ErrorReportForm
    setRefreshDepartments(prev => !prev);
  };

  const handleReportClick = async (report: ErrorReport) => {
    // Immer die neueste Version der Meldung aus dem Storage holen
    const latestReports = await getErrorReports();
    const latestReport = latestReports.find(r => r.id === report.id);
    
    if (!latestReport) {
      toast.error("Fehlermeldung nicht gefunden");
      return;
    }

    // Add current report to history for navigation back (only if navigating from another report)
    if (selectedReport) {
      setViewHistory(prev => [...prev, selectedReport]);
    }

    if (isAuthenticated) {
      // Teamleiter: pending Meldungen direkt bearbeiten, andere zur Detail-Ansicht
      if (profile?.role === 'teamleader') {
        if (latestReport.approvalStatus === 'pending') {
          setEditingReport(latestReport);
        } else {
          setSelectedReport(latestReport);
        }
      } else {
        setSelectedReport(latestReport);
      }
    } else {
      // Für Mitarbeiter: nur freigegebene Meldungen anklickbar
      if (latestReport.approvalStatus === 'approved') {
        setSelectedReport(latestReport);
      } else if (latestReport.approvalStatus === 'pending') {
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
    // If report is rejected, open it in edit mode for anyone accessing through search
    if (report.approvalStatus === 'rejected') {
      setEditingReport(report);
    } else {
      setSelectedReport(report);
    }
  };

  // Prüfe ob Vertretungsfeld angezeigt werden soll
  const shouldShowDeputySelection = () => {
    if (!isAuthenticated || !profile) return false;
    
    // Zeige für Teamleiter
    if (profile.role === 'teamleader') return true;
    
    // Zeige für normale Mitarbeiter nur wenn sie bereits als Vertretung eingetragen sind
    return isUserDeputy(profile.id);
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

  // Zeige Schritt-für-Schritt Formular
  if (showStepForm) {
    return (
      <StepByStepForm 
        onReportCreated={handleNewReport}
        onClose={() => setShowStepForm(false)}
      />
    );
  }

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
        onViewReport={handleViewRelatedReport}
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
        onViewReport={handleViewRelatedReport}
        backButtonText={viewHistory.length > 0 ? "Zurück zur Fehlermeldung" : "Zurück zur Übersicht"}
      />
    );
  }

  const stats = getErrorReportStatistics();

  return (
    <div className="min-h-screen bg-light-blue">
      {/* Buttons fixed in top right corner */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
        {isAuthenticated && profile ? (
          <>
            <Badge variant="default">
              {profile.role === 'admin' ? 'Administrator' : profile.role === 'teamleader' ? 'Teamleiter' : 'Mitarbeiter'}: {profile.name}
            </Badge>
            {(profile.role === 'teamleader' || profile.role === 'admin') && (
              <Button variant="outline" onClick={() => setSelectedTab('dashboard')}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={handleSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
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

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hauptinhalt */}
        {selectedTab === 'new-report' ? (
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
        ) : selectedTab === 'dashboard' && isAuthenticated && profile && (profile.role === 'teamleader' || profile.role === 'admin') ? (
          // Teamleiter/Admin Dashboard
          <div className="space-y-4">
            <Button variant="outline" onClick={handleBackToOverview} className="mb-4">
              ← Zurück zur Startseite
            </Button>

            {/* Filter und Sortierung */}
            <Card>
              <CardHeader>
                <CardTitle>Filter & Sortierung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Suchleiste */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder={searchType === 'orderNumber' ? 'Nach Auftragsnummer suchen...' : 'Nach Artikelnummer suchen...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={searchType} onValueChange={(value: 'orderNumber' | 'articleNumber') => setSearchType(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orderNumber">Auftragsnummer</SelectItem>
                      <SelectItem value="articleNumber">Artikelnummer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter und Sortierung */}
                <div className="flex gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Status filtern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="pending">Zur Prüfung</SelectItem>
                      <SelectItem value="approved">Freigegeben</SelectItem>
                      <SelectItem value="rejected">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => handleToggleSort('date')}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Datum {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleToggleSort('orderNumber')}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Auftragsnr. {sortBy === 'orderNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </Button>

                  <Badge variant="secondary" className="ml-auto self-center">
                    {filteredReports.length} Meldung(en)
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <ApprovalDashboard 
              reports={filteredReports.map(report => ({
                id: report.id,
                order_number: report.orderNumber,
                afo_number: report.afoNumber,
                machine_id: report.machine,
                defective_quantity: report.defectiveQuantity,
                total_defective_quantity: report.totalDefectiveQuantity,
                quantity_type: report.quantityType,
                problem_description: report.problemDescription,
                corrective_action: report.correctiveAction,
                creator_name: report.creator,
                personal_number: report.personalNumber,
                created_at: report.createdAt,
                approval_status: report.approvalStatus as 'pending' | 'approved' | 'rejected'
              }))}
              onApprovalChange={handleApprovalChange}
              onReportClick={(report) => {
                // Convert back to ErrorReport format and open detail view
                const fullReport = filteredReports.find(r => r.id === report.id);
                if (fullReport) {
                  handleReportClick(fullReport);
                }
              }}
            />
          </div>
        ) : (
          // Start screen mit runden Buttons
          <div className="relative h-[calc(100vh-100px)] flex flex-col">
            {/* Neue Meldung Button - zentriert */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-6">
                <Button
                  onClick={handleCreateReport}
                  size="lg"
                  variant="outline"
                  className="h-48 w-48 rounded-full p-0 bg-white border-2 border-gray-300 hover:bg-gray-50 animate-fade-in hover-scale"
                >
                  <Plus style={{ width: '128px', height: '128px' }} strokeWidth={1} className="text-gray-700" />
                </Button>
                <span className="text-3xl font-medium text-gray-700">Neue Fehlermeldung</span>
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

      {/* Admin Auth Dialog */}
      <AdminAuthDialog
        isOpen={showAdminAuth}
        onClose={() => setShowAdminAuth(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={handleSettingsClose}
      />

      {/* Logo Component - Fixed to bottom right */}
      <Logo />
    </div>
  );
};

export default Index;
