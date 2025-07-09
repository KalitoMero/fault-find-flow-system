
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, FileText, Download, CheckCircle, Clock, Users } from 'lucide-react';
import ErrorReportForm from '@/components/ErrorReportForm';
import ApprovalDashboard from '@/components/ApprovalDashboard';
import ExportSection from '@/components/ExportSection';
import { ErrorReport, getErrorReports, getErrorReportsForApproval } from '@/lib/storage';
import { toast } from "sonner";

const Index = () => {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [pendingReports, setPendingReports] = useState<ErrorReport[]>([]);
  const [userRole, setUserRole] = useState<'employee' | 'supervisor'>('employee');
  const [currentUser, setCurrentUser] = useState('Max Mustermann');
  const [currentPersonalNumber, setCurrentPersonalNumber] = useState('12345');
  const location = useLocation();

  // Simuliere Benutzerrolle basierend auf URL-Parameter oder localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') as 'employee' | 'supervisor';
    if (role) {
      setUserRole(role);
      localStorage.setItem('userRole', role);
    } else {
      const savedRole = localStorage.getItem('userRole') as 'employee' | 'supervisor';
      if (savedRole) setUserRole(savedRole);
    }
  }, []);

  const loadData = () => {
    const reports = getErrorReports();
    setErrorReports(reports);
    
    const pending = getErrorReportsForApproval();
    setPendingReports(pending);
  };

  useEffect(() => {
    loadData();
    // Aktualisiere Daten alle 30 Sekunden
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNewReport = () => {
    loadData();
    toast.success("Fehlermeldung erfolgreich erstellt!");
  };

  const handleApprovalChange = () => {
    loadData();
    toast.success("Freigabestatus aktualisiert!");
  };

  const getStatistics = () => {
    const total = errorReports.length;
    const pending = pendingReports.length;
    const approved = errorReports.filter(r => r.approvalStatus === 'approved').length;
    const rejected = errorReports.filter(r => r.approvalStatus === 'rejected').length;
    
    return { total, pending, approved, rejected };
  };

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
              <Badge variant={userRole === 'supervisor' ? 'default' : 'secondary'}>
                {userRole === 'supervisor' ? 'Team-/Schichtleiter' : 'Mitarbeiter'}
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser}</p>
                <p className="text-xs text-gray-500">Personal-Nr: {currentPersonalNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Meldungen</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Alle erfassten Meldungen</p>
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="new-report" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Neue Meldung</span>
            </TabsTrigger>
            {userRole === 'supervisor' && (
              <TabsTrigger value="approval" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Freigaben</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Fehlermeldungen</CardTitle>
                <CardDescription>
                  Übersicht der letzten Meldungen aus Ihrer Abteilung
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorReports.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Meldungen vorhanden</h3>
                    <p className="text-gray-500 mb-4">Erstellen Sie Ihre erste Fehlermeldung</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Meldung erstellen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {errorReports.slice(0, 10).map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
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
          </TabsContent>

          <TabsContent value="new-report">
            <ErrorReportForm 
              currentUser={currentUser}
              currentPersonalNumber={currentPersonalNumber}
              onReportCreated={handleNewReport}
            />
          </TabsContent>

          {userRole === 'supervisor' && (
            <TabsContent value="approval">
              <ApprovalDashboard
                reports={pendingReports}
                onApprovalChange={handleApprovalChange}
              />
            </TabsContent>
          )}

          <TabsContent value="export">
            <ExportSection reports={errorReports} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
