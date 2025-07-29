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
  const [showPreview, setShowPreview] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

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

    console.log('=== EXCEL IMPORT DEBUG ===');
    console.log('File name:', uploadedFile.name);
    console.log('File type:', uploadedFile.type);
    console.log('File size:', uploadedFile.size, 'bytes');

    // Enhanced file type validation
    const fileName = uploadedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      toast.error('Bitte wählen Sie eine gültige Excel (.xlsx, .xls) oder CSV-Datei aus.');
      return;
    }

    try {
      setFile(uploadedFile);
      
      let parsedData: any[] = [];
      let headers: string[] = [];
      
      if (isCSV) {
        console.log('🔍 Processing CSV file...');
        const text = await uploadedFile.text();
        console.log('Raw CSV content (first 200 chars):', text.substring(0, 200));
        
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('CSV-Datei ist leer');
        }
        
        // Enhanced CSV parsing with better delimiter detection
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        console.log('Detected delimiter:', delimiter);
        
        headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        console.log('📋 CSV Headers found:', headers);
        
        parsedData = lines.slice(1).map((line, index) => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, headerIndex) => {
            row[header] = values[headerIndex] || '';
          });
          return row;
        }).filter(row => Object.values(row).some(val => val !== ''));
        
      } else {
        console.log('🔍 Processing Excel file...');
        const arrayBuffer = await uploadedFile.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        
        // Enhanced Excel parsing with better error handling
        const workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellText: false,
          cellHTML: false,
          sheetStubs: false
        });
        
        console.log('📊 Workbook loaded. Sheets:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Excel-Datei enthält keine Arbeitsblätter');
        }
        
        const worksheet = workbook.Sheets[sheetName];
        console.log('📄 Using sheet:', sheetName);
        
        // Get range information
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        console.log('📐 Sheet range:', range);
        
        // Convert to JSON with proper handling
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          blankrows: false
        }) as any[][];
        
        console.log('📥 Raw JSON data rows:', jsonData.length);
        
        if (jsonData.length === 0) {
          throw new Error('Excel-Datei ist leer');
        }
        
        // Clean and validate headers
        headers = jsonData[0]
          .map(h => String(h || '').trim())
          .filter(h => h !== '');
        
        console.log('📋 Excel Headers found:', headers);
        
        if (headers.length === 0) {
          throw new Error('Keine gültigen Spaltenüberschriften gefunden');
        }
        
        // Process data rows with better validation
        parsedData = jsonData.slice(1)
          .filter(row => row && row.length > 0)
          .map((row, index) => {
            const rowData: any = {};
            headers.forEach((header, headerIndex) => {
              const cellValue = row[headerIndex];
              rowData[header] = String(cellValue || '').trim();
            });
            return rowData;
          })
          .filter(row => Object.values(row).some(val => val !== ''));
      }
      
      if (parsedData.length === 0) {
        throw new Error('Keine gültigen Datenzeilen gefunden');
      }
      
      console.log('✅ Successfully parsed:', parsedData.length, 'data rows');
      console.log('📋 Final headers:', headers);
      console.log('🔍 Sample data row:', parsedData[0]);
      
      // Validate data structure
      const sampleRow = parsedData[0];
      const validColumns = Object.keys(sampleRow).filter(key => key.trim() !== '');
      console.log('✨ Valid columns:', validColumns);
      
      setExcelData(parsedData);
      setColumns(headers);
      setFileName(uploadedFile.name);
      setRowCount(parsedData.length);
      setShowPreview(true);
      
      toast.success(`✅ Datei erfolgreich geladen: ${parsedData.length} Zeilen, ${headers.length} Spalten`);
      
    } catch (error) {
      console.error('❌ Error processing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Fehler beim Verarbeiten der Datei: ${errorMessage}`);
      
      // Reset state on error
      setFile(null);
      setExcelData([]);
      setColumns([]);
      setFileName('');
      setRowCount(0);
      setShowPreview(false);
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

  const testColumnMapping = () => {
    if (!orderNumberColumn || !afoNumberColumn || excelData.length === 0) {
      toast.error('Bitte laden Sie zuerst eine Datei und wählen Sie die Spalten aus.');
      return;
    }

    console.log('=== COLUMN MAPPING TEST ===');
    
    // Convert column numbers to actual column names
    const orderColName = columns[parseInt(orderNumberColumn) - 1];
    const afoColName = columns[parseInt(afoNumberColumn) - 1];
    
    console.log('Order column name:', orderColName);
    console.log('AFO column name:', afoColName);
    
    // Test with first few rows
    const testRows = excelData.slice(0, 3);
    console.log('Testing with rows:', testRows);
    
    testRows.forEach((row, index) => {
      const orderValue = row[orderColName];
      const afoValue = row[afoColName];
      console.log(`Row ${index + 1}: Order="${orderValue}", AFO="${afoValue}"`);
    });

    toast.success(`✅ Test erfolgreich! Order-Spalte: "${orderColName}", AFO-Spalte: "${afoColName}"`);
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

    // Enhanced validation with proper column name mapping
    const orderColumnIndex = parseInt(orderNumberColumn) - 1;
    const afoColumnIndex = parseInt(afoNumberColumn) - 1;
    
    if (orderColumnIndex < 0 || orderColumnIndex >= columns.length) {
      toast.error(`Ungültige Auftragsnummer-Spalte. Verfügbare Spalten: 1-${columns.length}`);
      return;
    }
    
    if (afoColumnIndex < 0 || afoColumnIndex >= columns.length) {
      toast.error(`Ungültige AFO-Nummer-Spalte. Verfügbare Spalten: 1-${columns.length}`);
      return;
    }

    // Map column numbers to actual column names for storage
    const orderColName = columns[orderColumnIndex];
    const afoColName = columns[afoColumnIndex];
    const deptColName = departmentColumn ? columns[parseInt(departmentColumn) - 1] : undefined;

    console.log('=== SAVING SETTINGS ===');
    console.log('Column mappings:');
    console.log(`- Order Number: Column ${orderNumberColumn} = "${orderColName}"`);
    console.log(`- AFO Number: Column ${afoNumberColumn} = "${afoColName}"`);
    console.log(`- Department: Column ${departmentColumn} = "${deptColName}"`);
    
    // Test data access
    const sampleRow = excelData[0];
    console.log('Sample data access:');
    console.log(`- Order value: "${sampleRow[orderColName]}"`);
    console.log(`- AFO value: "${sampleRow[afoColName]}"`);

    const settings = {
      orderNumberColumn,
      afoNumberColumn,
      departmentColumn: departmentColumn || undefined,
      additionalColumns,
      fileName,
      rowCount: excelData.length,
      // Store actual column names for easier lookup
      orderColumnName: orderColName,
      afoColumnName: afoColName,
      departmentColumnName: deptColName
    };

    saveExcelData(excelData);
    saveExcelSettings(settings);

    toast.success(`✅ Einstellungen gespeichert! ${excelData.length} Zeilen verfügbar.`);
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
    setShowPreview(false);
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
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Upload className="h-4 w-4" />
                  {file?.name || fileName} ({file ? excelData.length : rowCount} Zeilen geladen)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Vorschau ausblenden' : 'Daten-Vorschau anzeigen'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDebugMode(!debugMode)}
                  >
                    {debugMode ? 'Debug aus' : 'Debug an'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showPreview && excelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Daten-Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Erste 3 Zeilen der geladenen Daten:
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-1 text-left font-medium">#</th>
                      {columns.map((col, index) => (
                        <th key={index} className="border border-gray-300 px-2 py-1 text-left font-medium">
                          {index + 1}: {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1 font-medium">{rowIndex + 1}</td>
                        {columns.map((col, colIndex) => (
                          <td key={colIndex} className="border border-gray-300 px-2 py-1">
                            {String(row[col] || '').substring(0, 50)}
                            {String(row[col] || '').length > 50 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {debugMode && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Debug-Informationen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <strong>Verfügbare Spalten:</strong>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {columns.map((col, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <span className="font-mono">{index + 1}: </span>
                      <span>"{col}"</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <strong>Erste Datenzeile (Rohformat):</strong>
                <pre className="mt-2 p-3 bg-gray-50 rounded overflow-x-auto text-xs">
                  {JSON.stringify(excelData[0], null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔗 Spalten-Zuordnung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order-column">Auftragsnummer Spalte *</Label>
                <div className="mt-1">
                  <Input
                    id="order-column"
                    type="number"
                    min="1"
                    max={columns.length}
                    value={orderNumberColumn}
                    onChange={(e) => setOrderNumberColumn(e.target.value)}
                    placeholder={`1-${columns.length}`}
                  />
                  {orderNumberColumn && (
                    <div className="mt-1 text-xs text-gray-600">
                      → Spalte "{columns[parseInt(orderNumberColumn) - 1] || 'ungültig'}"
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="afo-column">AFO-Nummer Spalte *</Label>
                <div className="mt-1">
                  <Input
                    id="afo-column"
                    type="number"
                    min="1"
                    max={columns.length}
                    value={afoNumberColumn}
                    onChange={(e) => setAfoNumberColumn(e.target.value)}
                    placeholder={`1-${columns.length}`}
                  />
                  {afoNumberColumn && (
                    <div className="mt-1 text-xs text-gray-600">
                      → Spalte "{columns[parseInt(afoNumberColumn) - 1] || 'ungültig'}"
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="departmentColumn">Abteilung (Optional)</Label>
                <div className="mt-1">
                  <Input
                    id="departmentColumn"
                    type="number"
                    min="1"
                    max={columns.length}
                    placeholder={`1-${columns.length}`}
                    value={departmentColumn}
                    onChange={(e) => setDepartmentColumn(e.target.value)}
                  />
                  {departmentColumn && (
                    <div className="mt-1 text-xs text-gray-600">
                      → Spalte "{columns[parseInt(departmentColumn) - 1] || 'ungültig'}"
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={testColumnMapping}
                disabled={!orderNumberColumn || !afoNumberColumn}
              >
                🧪 Spalten-Zuordnung testen
              </Button>
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
        <Button onClick={handleSave} disabled={!orderNumberColumn || !afoNumberColumn || excelData.length === 0}>
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