import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Plus, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import { saveExcelData, saveExcelSettings, getExcelSettings, getExcelData, clearExcelData } from '@/lib/excelStorage';
import { toast } from "sonner";
import ExcelJS from 'exceljs';

interface ExcelColumn {
  name: string;
  column: string;
}

// Helper function to format Excel date values
const formatExcelDate = (value: any): string => {
  if (!value) return '';
  
  // If it's already a string, return as is
  if (typeof value === 'string') {
    // Check if it looks like a date string
    const dateTest = new Date(value);
    if (!isNaN(dateTest.getTime())) {
      return dateTest.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return value;
  }
  
  // If it's a number (Excel date serial number)
  if (typeof value === 'number') {
    // Excel date serial numbers start from 1900-01-01 (with some quirks)
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch accounting for leap year bug
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
  
  // If it's already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Return original value if no date conversion possible
  return String(value);
};

// Helper function to process cell values from Excel
const processCellValue = (cell: any): string => {
  if (!cell) return '';
  
  // Handle different cell types
  if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
    return formatExcelDate(cell.value);
  }
  
  if (cell.type === ExcelJS.ValueType.Number && cell.numFmt && cell.numFmt.includes('d')) {
    // This might be a date formatted as number
    return formatExcelDate(cell.value);
  }
  
  // For text or other types, use the text property or value as-is
  if (cell.text !== undefined) {
    return String(cell.text).trim();
  }
  
  if (cell.value !== undefined) {
    return String(cell.value).trim();
  }
  
  return '';
};

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
    const loadExcelData = async () => {
      const existingData = await getExcelData();
      if (existingData) {
        setExcelData(existingData.data);
        // Extract columns from the first row
        if (existingData.data.length > 0) {
          setColumns(Object.keys(existingData.data[0]));
        }
      }
    };
    loadExcelData();
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
            const value = values[headerIndex] || '';
            // Keep original value as-is for CSV files
            row[header] = value;
          });
          return row;
        }).filter(row => Object.values(row).some(val => val !== ''));
        
      } else {
        console.log('🔍 Processing Excel file...');
        const arrayBuffer = await uploadedFile.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        
        // Use ExcelJS to read Excel files
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        console.log('📊 Workbook loaded. Sheets:', workbook.worksheets.map(ws => ws.name));
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Excel-Datei enthält keine Arbeitsblätter');
        }
        
        console.log('📄 Using sheet:', worksheet.name);
        
        // Extract headers from first row
        const headerRow = worksheet.getRow(1);
        headers = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const headerValue = processCellValue(cell);
          if (headerValue.trim()) {
            headers.push(headerValue.trim());
          }
        });
        
        console.log('📋 Excel Headers found:', headers);
        
        if (headers.length === 0) {
          throw new Error('Keine gültigen Spaltenüberschriften gefunden');
        }
        
        // Process data rows with improved date handling
        parsedData = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row
          
          const rowData: any = {};
          let hasData = false;
          
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= headers.length) {
              const header = headers[colNumber - 1];
              const cellValue = processCellValue(cell);
              rowData[header] = cellValue;
              if (cellValue.trim()) hasData = true;
            }
          });
          
          if (hasData) {
            parsedData.push(rowData);
          }
        });
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

  const handleSave = async () => {
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

    await saveExcelData(excelData);
    saveExcelSettings(settings);

    toast.success(`✅ Einstellungen gespeichert! ${excelData.length} Zeilen verfügbar.`);
  };

  const handleClear = async () => {
    await clearExcelData();
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
