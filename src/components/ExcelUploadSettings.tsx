import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Plus, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import { saveExcelData, saveExcelSettings, getExcelSettings, clearExcelData } from '@/lib/excelStorage';
import { toast } from "sonner";

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

  useEffect(() => {
    const settings = getExcelSettings();
    if (settings) {
      setOrderNumberColumn(settings.orderNumberColumn);
      setAfoNumberColumn(settings.afoNumberColumn);
      setDepartmentColumn(settings.departmentColumn || '');
      setAdditionalColumns(settings.additionalColumns);
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv') && !uploadedFile.name.endsWith('.xlsx')) {
      toast.error('Bitte laden Sie eine CSV- oder Excel-Datei hoch');
      return;
    }

    setFile(uploadedFile);

    try {
      const text = await uploadedFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setExcelData(data);
      setColumns(headers);
      toast.success(`Excel-Datei erfolgreich geladen (${data.length} Zeilen)`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Fehler beim Lesen der Datei');
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

    if (excelData.length > 0) {
      saveExcelData(excelData);
    }

    saveExcelSettings({
      orderNumberColumn,
      afoNumberColumn,
      departmentColumn: departmentColumn || undefined,
      additionalColumns
    });

    toast.success('Excel-Einstellungen gespeichert');
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
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Upload className="h-4 w-4" />
                {file.name} ({excelData.length} Zeilen geladen)
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