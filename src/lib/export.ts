// Export-Funktionen für Excel und CSV

import { ErrorReport } from './storage';
import * as XLSX from 'xlsx';

interface ExportFields {
  basicInfo: boolean;
  quantities: boolean;
  descriptions: boolean;
  timestamps: boolean;
  approval: boolean;
}

// Excel Export mit echter Excel-Datei und Formatierung
export const exportToExcel = async (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean,
  filename: string
): Promise<void> => {
  const headers = buildHeaders(fields, includeAudio);
  const data = buildDataRows(reports, fields, includeAudio);
  
  // Arbeitsblatt erstellen
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Spaltenbreite automatisch anpassen
  const colWidths = headers.map((header, colIndex) => {
    const headerLength = header.length;
    const maxDataLength = Math.max(...data.map(row => String(row[colIndex] || '').length));
    return { wch: Math.max(headerLength, maxDataLength, 10) };
  });
  ws['!cols'] = colWidths;
  
  // Textumbruch für alle Zellen aktivieren
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.alignment = { 
        wrapText: true,
        vertical: 'top'
      };
    }
  }
  
  // Header-Formatierung (farbiger Hintergrund)
  for (let col = 0; col < headers.length; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    ws[cellAddress].s.fill = {
      fgColor: { rgb: "4472C4" }
    };
    ws[cellAddress].s.font = {
      color: { rgb: "FFFFFF" },
      bold: true
    };
  }
  
  // AutoFilter für sortierbare Daten aktivieren
  ws['!autofilter'] = { ref: ws['!ref'] };
  
  // Arbeitsmappe erstellen
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fehlermeldungen');
  
  // Als Excel-Datei speichern
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// CSV Export
export const exportToCSV = async (
  reports: ErrorReport[],
  fields: ExportFields,
  filename: string
): Promise<void> => {
  const headers = buildHeaders(fields, false);
  const csvContent = buildCSVContent(reports, fields, false, headers);
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `${filename}.csv`);
};

// Header-Array basierend auf ausgewählten Feldern erstellen
const buildHeaders = (fields: ExportFields, includeAudio: boolean): string[] => {
  const headers: string[] = [];

  if (fields.basicInfo) {
    headers.push(
      'Fehlermeldungs-ID',
      'Auftragsnummer',
      'AFO-Nummer',
      'Maschine'
    );
  }

  if (fields.quantities) {
    headers.push(
      'Beanstandete Menge',
      'Gesamt beanstandete Menge'
    );
  }

  if (fields.descriptions) {
    headers.push(
      'Problembeschreibung',
      'Fehlerursache',
      'Korrekturmaßnahme'
    );
  }

  if (fields.timestamps) {
    headers.push(
      'Ersteller',
      'Personal-Nummer',
      'Erstellt am'
    );
  }

  if (fields.approval) {
    headers.push(
      'Freigabestatus',
      'Freigegeben von',
      'Freigegeben am',
      'Ablehnungsgrund'
    );
  }

  if (includeAudio) {
    headers.push(
      'Audio Problem vorhanden',
      'Audio Ursache vorhanden',
      'Audio Maßnahme vorhanden'
    );
  }

  return headers;
};

// Excel-kompatible CSV erstellen
const buildExcelCompatibleCSV = (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean,
  headers: string[]
): string => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'approved': return 'Freigegeben';
      case 'rejected': return 'Abgelehnt';
      case 'pending': return 'Zur Prüfung';
      default: return status;
    }
  };

  const escapeCsvValue = (value: any): string => {
    if (value == null) return '';
    const str = String(value);
    // Für Excel: Semikolon als Trennzeichen verwenden
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.map(h => escapeCsvValue(h)).join(';')];

  reports.forEach(report => {
    const row: string[] = [];

    if (fields.basicInfo) {
      row.push(
        escapeCsvValue(report.id),
        escapeCsvValue(report.orderNumber),
        escapeCsvValue(report.afoNumber),
        escapeCsvValue(report.machine)
      );
    }

    if (fields.quantities) {
      row.push(
        escapeCsvValue(report.defectiveQuantity),
        escapeCsvValue(report.totalDefectiveQuantity)
      );
    }

    if (fields.descriptions) {
      row.push(
        escapeCsvValue(report.problemDescription),
        escapeCsvValue(report.errorCause),
        escapeCsvValue(report.correctiveAction)
      );
    }

    if (fields.timestamps) {
      row.push(
        escapeCsvValue(report.creator),
        escapeCsvValue(report.personalNumber),
        escapeCsvValue(formatDate(report.createdAt))
      );
    }

    if (fields.approval) {
      row.push(
        escapeCsvValue(formatStatus(report.approvalStatus)),
        escapeCsvValue(report.approvedBy || ''),
        escapeCsvValue(formatDate(report.approvedAt)),
        escapeCsvValue(report.rejectionReason || '')
      );
    }

    if (includeAudio) {
      row.push(
        escapeCsvValue(report.audioFiles?.problemDescription ? 'Ja' : 'Nein'),
        escapeCsvValue(report.audioFiles?.errorCause ? 'Ja' : 'Nein'),
        escapeCsvValue(report.audioFiles?.correctiveAction ? 'Ja' : 'Nein')
      );
    }

    rows.push(row.join(';'));
  });

  return rows.join('\r\n');
};

// Datenzeilen erstellen
const buildDataRows = (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean
): any[][] => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'approved': return 'Freigegeben';
      case 'rejected': return 'Abgelehnt';
      case 'pending': return 'Zur Prüfung';
      default: return status;
    }
  };

  return reports.map(report => {
    const row: any[] = [];

    if (fields.basicInfo) {
      row.push(
        report.id,
        report.orderNumber,
        report.afoNumber,
        report.machine
      );
    }

    if (fields.quantities) {
      row.push(
        report.defectiveQuantity,
        report.totalDefectiveQuantity
      );
    }

    if (fields.descriptions) {
      row.push(
        report.problemDescription,
        report.errorCause,
        report.correctiveAction
      );
    }

    if (fields.timestamps) {
      row.push(
        report.creator,
        report.personalNumber,
        formatDate(report.createdAt)
      );
    }

    if (fields.approval) {
      row.push(
        formatStatus(report.approvalStatus),
        report.approvedBy || '',
        formatDate(report.approvedAt),
        report.rejectionReason || ''
      );
    }

    if (includeAudio) {
      row.push(
        report.audioFiles?.problemDescription ? 'Ja' : 'Nein',
        report.audioFiles?.errorCause ? 'Ja' : 'Nein',
        report.audioFiles?.correctiveAction ? 'Ja' : 'Nein'
      );
    }

    return row;
  });
};

// Einfache Excel-Arbeitsmappe erstellen (XML-basiert)
const createWorkbook = (headers: string[], data: any[][]): ArrayBuffer => {
  // Excel XML-Struktur
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  
  const workbookXml = `
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Fehlermeldungen" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const worksheetXml = `
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      ${headers.map((header, index) => 
        `<c r="${getColumnLetter(index)}1" t="inlineStr"><is><t>${escapeXml(header)}</t></is></c>`
      ).join('')}
    </row>
    ${data.map((row, rowIndex) => `
    <row r="${rowIndex + 2}">
      ${row.map((cell, colIndex) => 
        `<c r="${getColumnLetter(colIndex)}${rowIndex + 2}" t="inlineStr"><is><t>${escapeXml(String(cell || ''))}</t></is></c>`
      ).join('')}
    </row>`).join('')}
  </sheetData>
</worksheet>`;

  // Vereinfachte XLSX-Struktur (als ZIP)
  const files = [
    { name: '[Content_Types].xml', content: createContentTypes() },
    { name: '_rels/.rels', content: createRels() },
    { name: 'xl/workbook.xml', content: xmlHeader + workbookXml },
    { name: 'xl/worksheets/sheet1.xml', content: xmlHeader + worksheetXml },
    { name: 'xl/_rels/workbook.xml.rels', content: createWorkbookRels() }
  ];

  // Erstelle ZIP-ähnliche Struktur (vereinfacht für Demo)
  // In einer echten Implementierung würde hier eine ZIP-Library verwendet
  return createSimplifiedExcel(headers, data);
};

// Vereinfachte Excel-Erstellung (fallback zu verbessertem CSV mit Excel-Kompatibilität)
const createSimplifiedExcel = (headers: string[], data: any[][]): ArrayBuffer => {
  // HTML-Tabelle die Excel öffnen kann
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${row.map(cell => `<td>${escapeHtml(String(cell || ''))}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

  return new TextEncoder().encode(htmlContent).buffer;
};

// Hilfsfunktionen
const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const createContentTypes = (): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
};

const createRels = (): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
};

const createWorkbookRels = (): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
};

// CSV-Inhalt erstellen
const buildCSVContent = (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean,
  headers: string[]
): string => {
  const escapeCsvValue = (value: any): string => {
    if (value == null) return '';
    const str = String(value);
    // Anführungszeichen escapen und Wert in Anführungszeichen setzen wenn nötig
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'approved': return 'Freigegeben';
      case 'rejected': return 'Abgelehnt';
      case 'pending': return 'Zur Prüfung';
      default: return status;
    }
  };

  const rows = [headers.join(',')];

  reports.forEach(report => {
    const row: string[] = [];

    if (fields.basicInfo) {
      row.push(
        escapeCsvValue(report.id),
        escapeCsvValue(report.orderNumber),
        escapeCsvValue(report.afoNumber),
        escapeCsvValue(report.machine)
      );
    }

    if (fields.quantities) {
      row.push(
        escapeCsvValue(report.defectiveQuantity),
        escapeCsvValue(report.totalDefectiveQuantity)
      );
    }

    if (fields.descriptions) {
      row.push(
        escapeCsvValue(report.problemDescription),
        escapeCsvValue(report.errorCause),
        escapeCsvValue(report.correctiveAction)
      );
    }

    if (fields.timestamps) {
      row.push(
        escapeCsvValue(report.creator),
        escapeCsvValue(report.personalNumber),
        escapeCsvValue(formatDate(report.createdAt))
      );
    }

    if (fields.approval) {
      row.push(
        escapeCsvValue(formatStatus(report.approvalStatus)),
        escapeCsvValue(report.approvedBy || ''),
        escapeCsvValue(formatDate(report.approvedAt)),
        escapeCsvValue(report.rejectionReason || '')
      );
    }

    if (includeAudio) {
      row.push(
        escapeCsvValue(report.audioFiles?.problemDescription ? 'Ja' : 'Nein'),
        escapeCsvValue(report.audioFiles?.errorCause ? 'Ja' : 'Nein'),
        escapeCsvValue(report.audioFiles?.correctiveAction ? 'Ja' : 'Nein')
      );
    }

    rows.push(row.join(','));
  });

  return rows.join('\n');
};

// Datei-Download
const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// API-Kompatible Daten für BI-Tools
export const generateAPIResponse = (
  reports: ErrorReport[],
  format: 'json' | 'csv' = 'json'
): any => {
  if (format === 'json') {
    return {
      timestamp: new Date().toISOString(),
      count: reports.length,
      data: reports.map(report => ({
        id: report.id,
        orderNumber: report.orderNumber,
        afoNumber: report.afoNumber,
        machine: report.machine,
        defectiveQuantity: report.defectiveQuantity,
        totalDefectiveQuantity: report.totalDefectiveQuantity,
        creator: report.creator,
        personalNumber: report.personalNumber,
        createdAt: report.createdAt,
        approvalStatus: report.approvalStatus,
        approvedAt: report.approvedAt,
        problemDescription: report.problemDescription,
        errorCause: report.errorCause,
        correctiveAction: report.correctiveAction,
        hasAudioFiles: !!(
          report.audioFiles?.problemDescription ||
          report.audioFiles?.errorCause ||
          report.audioFiles?.correctiveAction
        )
      }))
    };
  }

  // CSV Format für API
  const fields: ExportFields = {
    basicInfo: true,
    quantities: true,
    descriptions: true,
    timestamps: true,
    approval: true
  };
  
  const headers = buildHeaders(fields, false);
  return buildCSVContent(reports, fields, false, headers);
};
