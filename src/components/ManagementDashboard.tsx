import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, TrendingUp, Euro, Users, Clock, AlertTriangle } from 'lucide-react';
import { getDepartments, Department } from '@/lib/settingsStorage';
import { getErrorReports, ErrorReport } from '@/lib/storage';
import ApprovalDashboard from './ApprovalDashboard';
import { toast } from 'sonner';
import { getTeamLeaderStatistics } from '@/lib/supabaseStorage';

interface ManagementDashboardProps {
  onReportClick: (report: ErrorReport) => void;
}

const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ onReportClick }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'orderNumber' | 'articleNumber'>('orderNumber');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [sortBy, setSortBy] = useState<'date' | 'orderNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [teamLeaderStats, setTeamLeaderStats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [depts, reports, tlStats] = await Promise.all([
        getDepartments(),
        getErrorReports(),
        getTeamLeaderStatistics()
      ]);
      setDepartments(depts);
      setErrorReports(reports);
      setTeamLeaderStats(tlStats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSort = (field: 'date' | 'orderNumber') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredReports = errorReports
    .filter(report => {
      // Department filter
      if (selectedDepartment !== 'all' && report.excelDepartment !== selectedDepartment) {
        return false;
      }

      // Search filter
      let matchesSearch = searchTerm === '';
      if (searchTerm !== '') {
        if (searchType === 'orderNumber') {
          matchesSearch = report.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (searchType === 'articleNumber') {
          const additionalData = report.additionalExcelData || {};
          const articleNumber = additionalData['Artikelnummer'] || '';
          matchesSearch = articleNumber.toLowerCase().includes(searchTerm.toLowerCase());
        }
      }

      // Status filter
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Users className="h-4 w-4 mr-2" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="reports">
            <TrendingUp className="h-4 w-4 mr-2" />
            Fehlermeldungen
          </TabsTrigger>
          <TabsTrigger value="costs">
            <Euro className="h-4 w-4 mr-2" />
            Kosten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Teamleiter Übersicht</span>
              </CardTitle>
              <CardDescription>
                Überblick über alle Teamleiter und ihre Fehlermeldungen zur Prüfung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Lädt...</p>
                </div>
              ) : teamLeaderStats.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Teamleiter vorhanden
                  </h3>
                  <p className="text-gray-500">
                    Es wurden noch keine Teamleiter eingerichtet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamLeaderStats.map((leader: any) => (
                    <div 
                      key={leader.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{leader.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Abteilung: {leader.department}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-2xl font-bold text-orange-600">
                              {leader.pendingReports}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Zur Prüfung</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="h-4 w-4 text-gray-500" />
                            <span className="text-2xl font-bold text-gray-600">
                              {leader.totalReports}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Gesamt</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter & Sortierung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suchleiste mit Abteilungsfilter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={searchType === 'orderNumber' ? 'Nach Ba-Nr. suchen...' : 'Nach Artikelnummer suchen...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={searchType} onValueChange={(value: 'orderNumber' | 'articleNumber') => setSearchType(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="orderNumber">Ba-Nr.</SelectItem>
                    <SelectItem value="articleNumber">Artikelnummer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Abteilung" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">Alle Abteilungen</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} {dept.code && `(${dept.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter und Sortierung */}
              <div className="flex gap-4">
                <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
                  <ToggleGroupItem value="pending" aria-label="Offene Meldungen">
                    Offene Meldungen
                  </ToggleGroupItem>
                  <ToggleGroupItem value="approved" aria-label="Freigegeben">
                    Freigegeben
                  </ToggleGroupItem>
                  <ToggleGroupItem value="rejected" aria-label="Abgelehnt">
                    Abgelehnt
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label="Alle Meldungen">
                    Alle Meldungen
                  </ToggleGroupItem>
                </ToggleGroup>

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
            onApprovalChange={loadData}
            onReportClick={(report) => {
              const fullReport = filteredReports.find(r => r.id === report.id);
              if (fullReport) {
                onReportClick(fullReport);
              }
            }}
            hideApprovalButtons={false}
          />
          </div>
        </TabsContent>

        <TabsContent value="costs">
        <Card>
          <CardHeader>
            <CardTitle>Kostenübersicht</CardTitle>
            <CardDescription>
              Kostenanalyse kommt bald
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Euro className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Kostenübersicht wird in Kürze verfügbar sein</p>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagementDashboard;