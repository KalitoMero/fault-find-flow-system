// Export-Funktionen für Excel und CSV

import { ErrorReport } from './storage';
import ExcelJS from 'exceljs';

interface ExportFields {
  basicInfo: boolean;
  quantities: boolean;
  descriptions: boolean;
  timestamps: boolean;
  approval: boolean;
}

// Excel Export mit ExcelJS
export const exportToExcel = async (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean,
  filename: string
): Promise<void> => {
  try {
    console.log('🔧 Starting Excel export with ExcelJS...');
    
    // Neue Arbeitsmappe erstellen
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fehlerberichts-System';
    workbook.created = new Date();
    
    // Arbeitsblatt hinzufügen
    const worksheet = workbook.addWorksheet('Fehlerberichte');
    
    const headers = buildHeaders(fields, includeAudio, reports);
    const data = buildDataRows(reports, fields, includeAudio, headers);
    
    console.log('📊 Headers:', headers);
    console.log('📈 Data rows:', data.length);
    
    // Header-Zeile hinzufügen
    const headerRow = worksheet.addRow(headers);
    
    // Header-Formatierung
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FF000000' }, name: 'Calibri', size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9CD2ED' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      console.log(`🎨 Formatted header "${headers[colNumber - 1]}" in column ${colNumber}`);
    });
    
    // Datenzeilen hinzufügen
    data.forEach((rowData) => {
      const row = worksheet.addRow(rowData);
      
      // Zellenformatierung für Datenzeilen
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
    
    // Spaltenbreiten festlegen
    headers.forEach((header, index) => {
      const col = worksheet.getColumn(index + 1);
      if (header === 'Problembeschreibung' || header === 'Korrekturmaßnahme') {
        col.width = 94.63;
        console.log(`📏 Setting wide column "${header}" (index ${index}) to width 94.63`);
      } else {
        col.width = 20;
        console.log(`📏 Setting standard column "${header}" (index ${index}) to width 20`);
      }
    });
    
    // AutoFilter aktivieren
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: headers.length }
    };
    console.log('🔍 AutoFilter activated');
    
    console.log('🎨 Applied cell formatting to all', (data.length + 1) * headers.length, 'cells');
    
    // Excel-Datei als Buffer erstellen
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Blob erstellen und downloaden
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    downloadFile(blob, `${filename}.xlsx`);
    console.log('✅ Excel export completed successfully with ExcelJS');
    
  } catch (error) {
    console.error('❌ Error during Excel export:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Excel export failed: ${error.message}`);
  }
};

// CSV Export
export const exportToCSV = async (
  reports: ErrorReport[],
  fields: ExportFields,
  filename: string
): Promise<void> => {
  const headers = buildHeaders(fields, false, reports);
  const csvContent = buildCSVContent(reports, fields, false, headers);
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `${filename}.csv`);
};

// Header-Array basierend auf ausgewählten Feldern erstellen
const buildHeaders = (fields: ExportFields, includeAudio: boolean, reports: ErrorReport[] = []): string[] => {
  const headers: string[] = [];

  if (fields.basicInfo) {
    headers.push(
      'Auftragsnummer',
      'AFO-Nummer',
      'Abteilung',
      'Artikelnummer'
    );
  }

  if (fields.quantities) {
    headers.push(
      'Mengentyp',
      'Beanstandete Menge',
      'Gesamt beanstandete Menge'
    );
  }

  if (fields.descriptions) {
    headers.push(
      'Problembeschreibung',
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

  // Add dynamic headers for additional Excel data
  const additionalHeaders = new Set<string>();
  reports.forEach(report => {
    if (report.additionalExcelData) {
      Object.keys(report.additionalExcelData)
        .filter(key => key !== 'Artikelnummer') // Already included in basic info
        .forEach(key => additionalHeaders.add(key));
    }
  });

  headers.push(...Array.from(additionalHeaders).sort());

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
  includeAudio: boolean,
  headers: string[]
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
        report.orderNumber,
        report.afoNumber,
        report.excelDepartment || '',
        report.additionalExcelData?.Artikelnummer || ''
      );
    }

    if (fields.quantities) {
      row.push(
        report.quantityType || 'Ausschussmenge',
        report.defectiveQuantity,
        report.totalDefectiveQuantity
      );
    }

    if (fields.descriptions) {
      row.push(
        report.problemDescription,
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

    // Add additional Excel data based on headers
    const additionalHeaders = headers.slice();
    
    // Remove standard headers to get only additional ones
    if (fields.basicInfo) {
      additionalHeaders.splice(0, 4); // Remove basic info headers (4 instead of 5)
    }
    if (fields.quantities) {
      additionalHeaders.splice(0, 3); // Remove quantity headers
    }
    if (fields.descriptions) {
      additionalHeaders.splice(0, 2); // Remove description headers
    }
    if (fields.timestamps) {
      additionalHeaders.splice(0, 3); // Remove timestamp headers
    }
    if (fields.approval) {
      additionalHeaders.splice(0, 4); // Remove approval headers
    }
    if (includeAudio) {
      additionalHeaders.splice(0, 3); // Remove audio headers
    }
    
    // Add values for additional headers
    additionalHeaders.forEach(header => {
      const value = report.additionalExcelData?.[header] || '';
      row.push(value);
    });

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
        escapeCsvValue(report.orderNumber),
        escapeCsvValue(report.afoNumber),
        escapeCsvValue(report.excelDepartment || ''),
        escapeCsvValue(report.additionalExcelData?.Artikelnummer || '')
      );
    }

    if (fields.quantities) {
      row.push(
        escapeCsvValue(report.quantityType || 'Ausschussmenge'),
        escapeCsvValue(report.defectiveQuantity),
        escapeCsvValue(report.totalDefectiveQuantity)
      );
    }

    if (fields.descriptions) {
      row.push(
        escapeCsvValue(report.problemDescription),
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

    // Add additional Excel data based on headers
    const additionalHeaders = headers.slice();
    
    // Remove standard headers to get only additional ones
    if (fields.basicInfo) {
      additionalHeaders.splice(0, 4); // Remove basic info headers (4 instead of 5)
    }
    if (fields.quantities) {
      additionalHeaders.splice(0, 3); // Remove quantity headers
    }
    if (fields.descriptions) {
      additionalHeaders.splice(0, 2); // Remove description headers
    }
    if (fields.timestamps) {
      additionalHeaders.splice(0, 3); // Remove timestamp headers
    }
    if (fields.approval) {
      additionalHeaders.splice(0, 4); // Remove approval headers
    }
    if (includeAudio) {
      additionalHeaders.splice(0, 3); // Remove audio headers
    }
    
    // Add values for additional headers
    additionalHeaders.forEach(header => {
      const value = report.additionalExcelData?.[header] || '';
      row.push(escapeCsvValue(value));
    });

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
  
  const headers = buildHeaders(fields, false, reports);
  return buildCSVContent(reports, fields, false, headers);
};
