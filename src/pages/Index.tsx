
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, FileText, Download, CheckCircle, Clock, LogOut, Eye } from 'lucide-react';
import ErrorReportForm from '@/components/ErrorReportForm';
import ErrorReportDetail from '@/components/ErrorReportDetail';
import ExportSection from '@/components/ExportSection';
import LoginForm from '@/components/LoginForm';
import EmployeeOverview from '@/pages/EmployeeOverview';
import { useAuth } from '@/hooks/useAuth';
import { ErrorReport, getErrorReportsForSupervisor, getErrorReportStatistics } from '@/lib/storage';
import { toast } from "sonner";

const Index = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);

  const loadData = () => {
    if (user) {
      const reports = getErrorReportsForSupervisor(user.name);
      setErrorReports(reports);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
      // Aktualisiere Daten alle 30 Sekunden
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const handleNewReport = () => {
    loadData();
    toast.success("Fehlermeldung erfolgreich erstellt!");
  };

  const handleStatusChange = () => {
    loadData();
    setSelectedReport(null);
    setActiveTab('dashboard');
    toast.success("Status aktualisiert!");
  };

  const handleReportClick = (report: ErrorReport) => {
    setSelectedReport(report);
  };

  const handleBackToList = () => {
    setSelectedReport(null);
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  const handleBackFromLogin = () => {
    setShowLogin(false);
  };

  const getStatistics = () => {
    if (!user) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return getErrorReportStatistics(user.name);
  };

  // Zeige Login-Form wenn Login angefordert und nicht angemeldet
  if (showLogin && !isAuthenticated) {
    return <LoginForm onBack={handleBackFromLogin} />;
  }

  // Zeige Mitarbeiter-Übersicht wenn nicht angemeldet
  if (!isAuthenticated) {
    return <EmployeeOverview onShowLogin={handleShowLogin} />;
  }

  // Zeige Detailansicht wenn Meldung ausgewählt
  if (selectedReport) {
    return (
      <div className="min-h-screen bg-gray-50">
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
                <Badge variant="default">{user?.name}</Badge>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorReportDetail
            report={selectedReport}
            onBack={handleBackToList}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    );
  }

  const stats = getStatistics();

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
              <Badge variant="default">{user?.name}</Badge>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meine Meldungen</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Zugewiesene Meldungen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zur Prüfung</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Warten auf Freigabe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Genehmigt</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abgelehnt</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Zur Überarbeitung</p>
            </CardContent>
          </Card>
        </div>

        {/* Hauptinhalt Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Meine Meldungen</span>
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

          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Zugewiesene Fehlermeldungen</CardTitle>
                <CardDescription>
                  Übersicht der Ihnen zugewiesenen Meldungen (sortiert nach Datum)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorReports.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Meldungen vorhanden</h3>
                    <p className="text-gray-500">Ihnen sind aktuell keine Fehlermeldungen zugewiesen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {errorReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
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
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="new-report">
            <ErrorReportForm onReportCreated={handleNewReport} />
          </TabsContent>

          <TabsContent value="export">
            <ExportSection reports={errorReports} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
