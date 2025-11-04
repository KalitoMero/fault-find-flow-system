import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowUpDown, TrendingUp, Euro } from 'lucide-react';
import { getDepartments, Department } from '@/lib/settingsStorage';
import { getErrorReports, ErrorReport } from '@/lib/storage';
import ApprovalDashboard from './ApprovalDashboard';
import { toast } from 'sonner';

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
  const [viewMode, setViewMode] = useState<'overview' | 'costs'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [depts, reports] = await Promise.all([
        getDepartments(),
        getErrorReports()
      ]);
      setDepartments(depts);
      setErrorReports(reports);
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
      {/* View Mode Toggle */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          onClick={() => setViewMode('overview')}
          className="h-16 text-lg"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          Übersicht
        </Button>
        <Button
          variant={viewMode === 'costs' ? 'default' : 'outline'}
          onClick={() => setViewMode('costs')}
          className="h-16 text-lg"
        >
          <Euro className="h-5 w-5 mr-2" />
          Kosten
        </Button>
      </div>

      {viewMode === 'overview' ? (
        <>
          {/* Department Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Abteilungsfilter</CardTitle>
              <CardDescription>
                Wählen Sie eine Abteilung aus, um die Fehlermeldungen zu filtern
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Abteilung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} {dept.code && `(${dept.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

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
                  <SelectContent>
                    <SelectItem value="orderNumber">Ba-Nr.</SelectItem>
                    <SelectItem value="articleNumber">Artikelnummer</SelectItem>
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
            onApprovalChange={() => {}}
            onReportClick={(report) => {
              const fullReport = filteredReports.find(r => r.id === report.id);
              if (fullReport) {
                onReportClick(fullReport);
              }
            }}
            hideApprovalButtons={true}
          />
        </>
      ) : (
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
      )}
    </div>
  );
};

export default ManagementDashboard;