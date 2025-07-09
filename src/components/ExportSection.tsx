
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Database, Filter, Calendar } from 'lucide-react';
import { ErrorReport } from '@/lib/storage';
import { exportToExcel, exportToCSV } from '@/lib/export';
import { toast } from "sonner";

interface ExportSectionProps {
  reports: ErrorReport[];
}

const ExportSection: React.FC<ExportSectionProps> = ({ reports }) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [includeAudio, setIncludeAudio] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    basicInfo: true,
    quantities: true,
    descriptions: true,
    timestamps: true,
    approval: true
  });

  const getFilteredReports = () => {
    let filtered = [...reports];

    // Status-Filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(report => report.approvalStatus === filterStatus);
    }

    // Datums-Filter
    if (dateFrom) {
      filtered = filtered.filter(report => 
        new Date(report.createdAt) >= dateFrom
      );
    }

    if (dateTo) {
      filtered = filtered.filter(report => 
        new Date(report.createdAt) <= dateTo
      );
    }

    return filtered;
  };

  const handleExport = async () => {
    const filteredReports = getFilteredReports();
    
    if (filteredReports.length === 0) {
      toast.error("Keine Daten zum Exportieren gefunden");
      return;
    }

    try {
      const filename = `Fehlermeldungen_${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === 'excel') {
        await exportToExcel(filteredReports, selectedFields, includeAudio, filename);
        toast.success(`${filteredReports.length} Datensätze als Excel exportiert`);
      } else {
        await exportToCSV(filteredReports, selectedFields, filename);
        toast.success(`${filteredReports.length} Datensätze als CSV exportiert`);
      }
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error("Fehler beim Exportieren der Daten");
    }
  };

  const handleFieldChange = (field: string, checked: boolean) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const filteredCount = getFilteredReports().length;
  const approvedCount = reports.filter(r => r.approvalStatus === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-6 w-6 text-blue-600" />
            <span>Daten Export</span>
          </CardTitle>
          <CardDescription>
            Exportieren Sie Fehlermeldungen als Excel oder CSV für weitere Analysen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{reports.length}</p>
              <p className="text-sm text-blue-700">Gesamt Meldungen</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileSpreadsheet className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
              <p className="text-sm text-green-700">Freigegebene Meldungen</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Filter className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-900">{filteredCount}</p>
              <p className="text-sm text-orange-700">Gefilterte Ergebnisse</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export-Konfiguration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filter-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filter-Einstellungen</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status-Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Meldungen</SelectItem>
                  <SelectItem value="approved">Nur freigegebene</SelectItem>
                  <SelectItem value="pending">Zur Prüfung</SelectItem>
                  <SelectItem value="rejected">Abgelehnte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Datums-Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zeitraum</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Von:</label>
                  <DatePicker
                    date={dateFrom}
                    onDateChange={setDateFrom}
                    placeholder="Start-Datum"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bis:</label>
                  <DatePicker
                    date={dateTo}
                    onDateChange={setDateTo}
                    placeholder="End-Datum"
                  />
                </div>
              </div>
            </div>

            {/* Aktueller Filter */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gefilterte Datensätze:</span>
                <Badge variant="outline">{filteredCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export-Optionen */}
        <Card>
          <CardHeader>
            <CardTitle>Export-Optionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format-Auswahl */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export-Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feld-Auswahl */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zu exportierende Felder</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="basicInfo"
                    checked={selectedFields.basicInfo}
                    onCheckedChange={(checked) => handleFieldChange('basicInfo', checked as boolean)}
                  />
                  <label htmlFor="basicInfo" className="text-sm">
                    Basis-Informationen (ID, Auftrag, AFO, Maschine)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quantities"
                    checked={selectedFields.quantities}
                    onCheckedChange={(checked) => handleFieldChange('quantities', checked as boolean)}
                  />
                  <label htmlFor="quantities" className="text-sm">
                    Mengenangaben
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="descriptions"
                    checked={selectedFields.descriptions}
                    onCheckedChange={(checked) => handleFieldChange('descriptions', checked as boolean)}
                  />
                  <label htmlFor="descriptions" className="text-sm">
                    Beschreibungen (Problem, Ursache, Maßnahme)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timestamps"
                    checked={selectedFields.timestamps}
                    onCheckedChange={(checked) => handleFieldChange('timestamps', checked as boolean)}
                  />
                  <label htmlFor="timestamps" className="text-sm">
                    Zeitstempel und Ersteller
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approval"
                    checked={selectedFields.approval}
                    onCheckedChange={(checked) => handleFieldChange('approval', checked as boolean)}
                  />
                  <label htmlFor="approval" className="text-sm">
                    Freigabe-Status
                  </label>
                </div>
              </div>
            </div>

            {/* Audio-Export Option */}
            {exportFormat === 'excel' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAudio"
                  checked={includeAudio}
                  onCheckedChange={setIncludeAudio}
                />
                <label htmlFor="includeAudio" className="text-sm">
                  Audio-Referenzen einschließen
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export-Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Export bereit</h3>
              <p className="text-sm text-gray-600">
                {filteredCount} Datensätze werden als {exportFormat.toUpperCase()} exportiert
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleExport}
              disabled={filteredCount === 0}
              className="h-12 px-8"
            >
              <Download className="h-5 w-5 mr-2" />
              {exportFormat === 'excel' ? 'Als Excel exportieren' : 'Als CSV exportieren'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            API-Integration für BI-Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded font-mono text-sm">
            <p className="text-gray-600 mb-2">REST API Endpoint:</p>
            <code className="text-blue-600">GET /api/error-reports?status=approved&format=json</code>
            <p className="text-gray-600 mt-4 mb-2">Verfügbare Parameter:</p>
            <ul className="text-gray-600 text-xs space-y-1">
              <li>• status: all|approved|pending|rejected</li>
              <li>• from: YYYY-MM-DD (Start-Datum)</li>
              <li>• to: YYYY-MM-DD (End-Datum)</li>
              <li>• format: json|csv</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportSection;
