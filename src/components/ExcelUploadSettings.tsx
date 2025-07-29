import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Plus, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import { saveExcelData, saveExcelSettings, getExcelSettings, getExcelData, clearExcelData } from '@/lib/excelStorage';
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ExcelColumn {
  name: string;
  column: string;
}

const ExcelUploadSettings: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [orderNumberColumn, setOrderNumberColumn] = useState('');
  const [afoNumberColumn, setAfoNumberColumn] = useState('');
  const [departmentColumn, setDepartmentColumn] = useState('');
  const [additionalColumns, setAdditionalColumns] = useState<ExcelColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnRef, setNewColumnRef] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [rowCount, setRowCount] = useState<number>(0);

  useEffect(() => {
    const settings = getExcelSettings();
    if (settings) {
      setOrderNumberColumn(settings.orderNumberColumn);
      setAfoNumberColumn(settings.afoNumberColumn);
      setDepartmentColumn(settings.departmentColumn || '');
      setAdditionalColumns(settings.additionalColumns);
      setFileName(settings.fileName || '');
      setRowCount(settings.rowCount || 0);
    }
    
    // Load existing Excel data
    const existingData = getExcelData();
    if (existingData) {
      setExcelData(existingData.data);
      // Extract columns from the first row
      if (existingData.data.length > 0) {
        setColumns(Object.keys(existingData.data[0]));
      }
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const isValidType = allowedTypes.includes(uploadedFile.type) || 
                       uploadedFile.name.match(/\.(csv|xlsx|xls)$/i);
    
    if (!isValidType) {
      toast.error('Bitte wählen Sie eine gültige Excel- oder CSV-Datei aus.');
      return;
    }

    try {
      setFile(uploadedFile);
      console.log('Processing file:', uploadedFile.name, 'Type:', uploadedFile.type);
      
      let parsedData: any[] = [];
      let headers: string[] = [];
      
      if (uploadedFile.name.toLowerCase().endsWith('.csv')) {
        console.log('Processing as CSV file');
        // Parse CSV
        const text = await uploadedFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('CSV-Datei ist leer');
        }
        
        headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        console.log('CSV Headers:', headers);
        
        parsedData = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, headerIndex) => {
            row[header] = values[headerIndex] || '';
          });
          return row;
        }).filter(row => Object.values(row).some(val => val !== ''));
        
      } else {
        console.log('Processing as Excel file');
        // Parse Excel using xlsx
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Excel-Datei enthält keine Arbeitsblätter');
        }
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        }) as any[][];
        
        if (jsonData.length === 0) {
          throw new Error('Excel-Datei ist leer');
        }
        
        headers = jsonData[0].map(h => String(h).trim());
        console.log('Excel Headers:', headers);
        
        parsedData = jsonData.slice(1).map((row, index) => {
          const rowData: any = {};
          headers.forEach((header, headerIndex) => {
            rowData[header] = String(row[headerIndex] || '').trim();
          });
          return rowData;
        }).filter(row => Object.values(row).some(val => val !== ''));
      }
      
      if (parsedData.length === 0) {
        throw new Error('Keine gültigen Datenzeilen gefunden');
      }
      
      console.log('Parsed data:', parsedData.length, 'rows');
      console.log('Sample row:', parsedData[0]);
      
      setExcelData(parsedData);
      setColumns(headers);
      setFileName(uploadedFile.name);
      setRowCount(parsedData.length);
      
      toast.success(`Datei erfolgreich geladen: ${parsedData.length} Zeilen`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error(`Fehler beim Lesen der Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      // Reset state on error
      setFile(null);
      setExcelData([]);
      setColumns([]);
      setFileName('');
      setRowCount(0);
    }
  };

  const addAdditionalColumn = () => {
    if (newColumnName && newColumnRef) {
      setAdditionalColumns(prev => [...prev, { name: newColumnName, column: newColumnRef }]);
      setNewColumnName('');
      setNewColumnRef('');
    }
  };

  const removeAdditionalColumn = (index: number) => {
    setAdditionalColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!orderNumberColumn) {
      toast.error('Bitte geben Sie eine Spalten-Nummer für die Auftragsnummer ein');
      return;
    }

    if (!afoNumberColumn) {
      toast.error('Bitte geben Sie eine Spalten-Nummer für die AFO-Nummer ein');
      return;
    }

    if (excelData.length === 0) {
      toast.error('Keine Daten zum Speichern vorhanden.');
      return;
    }

    // Validate column selections
    const orderColumnIndex = parseInt(orderNumberColumn) - 1;
    const afoColumnIndex = parseInt(afoNumberColumn) - 1;
    
    if (orderColumnIndex >= columns.length || afoColumnIndex >= columns.length) {
      toast.error('Ungültige Spaltenauswahl. Bitte überprüfen Sie Ihre Einstellungen.');
      return;
    }

    console.log('Saving settings:', {
      orderNumberColumn,
      afoNumberColumn,
      departmentColumn,
      additionalColumns,
      fileName,
      rowCount: excelData.length
    });

    saveExcelData(excelData);
    saveExcelSettings({
      orderNumberColumn,
      afoNumberColumn,
      departmentColumn: departmentColumn || undefined,
      additionalColumns,
      fileName,
      rowCount: excelData.length
    });

    toast.success('Excel-Einstellungen und Daten erfolgreich gespeichert!');
  };

  const handleClear = () => {
    clearExcelData();
    setFile(null);
    setExcelData([]);
    setColumns([]);
    setOrderNumberColumn('');
    setAfoNumberColumn('');
    setDepartmentColumn('');
    setAdditionalColumns([]);
    setFileName('');
    setRowCount(0);
    toast.success('Excel-Daten gelöscht');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel-Datei hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-upload">Excel/CSV-Datei auswählen</Label>
            <div className="mt-2">
              <Input
                id="excel-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            {(file || fileName) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Upload className="h-4 w-4" />
                {file?.name || fileName} ({file ? excelData.length : rowCount} Zeilen geladen)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spalten-Zuordnung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order-column">Auftragsnummer Spalte *</Label>
                <Input
                  id="order-column"
                  type="number"
                  min="1"
                  value={orderNumberColumn}
                  onChange={(e) => setOrderNumberColumn(e.target.value)}
                  placeholder="Spalten-Nummer eingeben"
                />
              </div>

              <div>
                <Label htmlFor="afo-column">AFO-Nummer Spalte *</Label>
                <Input
                  id="afo-column"
                  type="number"
                  min="1"
                  value={afoNumberColumn}
                  onChange={(e) => setAfoNumberColumn(e.target.value)}
                  placeholder="Spalten-Nummer eingeben"
                />
              </div>
              
              <div>
                <Label htmlFor="departmentColumn">Abteilung (Optional)</Label>
                <Input
                  id="departmentColumn"
                  type="text"
                  placeholder="z.B. 3 (Spaltennummer)"
                  value={departmentColumn}
                  onChange={(e) => setDepartmentColumn(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zusätzliche Informationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="column-name">Bezeichnung</Label>
                <Input
                  id="column-name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="z.B. Kunde"
                />
              </div>
              <div>
                <Label htmlFor="column-ref">Spalte</Label>
                <Input
                  id="column-ref"
                  type="number"
                  min="1"
                  value={newColumnRef}
                  onChange={(e) => setNewColumnRef(e.target.value)}
                  placeholder="Spalten-Nummer eingeben"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addAdditionalColumn} disabled={!newColumnName || !newColumnRef}>
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
              </div>
            </div>

            {additionalColumns.length > 0 && (
              <div className="space-y-2">
                <Label>Zusätzliche Spalten:</Label>
                {additionalColumns.map((col, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{col.name}</span>
                    <span className="text-gray-600">→ {col.column}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalColumn(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={!orderNumberColumn || !afoNumberColumn}>
          <Save className="h-4 w-4 mr-2" />
          Einstellungen speichern
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <Trash2 className="h-4 w-4 mr-2" />
          Daten löschen
        </Button>
      </div>
    </div>
  );
};

export default ExcelUploadSettings;