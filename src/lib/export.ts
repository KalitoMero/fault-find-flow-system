
// Export-Funktionen für Excel und CSV
// Vereinfachte Implementierung - in Produktionsumgebung würden echte Libraries verwendet

import { ErrorReport } from './storage';

interface ExportFields {
  basicInfo: boolean;
  quantities: boolean;
  descriptions: boolean;
  timestamps: boolean;
  approval: boolean;
}

// Excel Export (vereinfacht als CSV mit Excel-Kompatibilität)
export const exportToExcel = async (
  reports: ErrorReport[],
  fields: ExportFields,
  includeAudio: boolean,
  filename: string
): Promise<void> => {
  const headers = buildHeaders(fields, includeAudio);
  const csvContent = buildCSVContent(reports, fields, includeAudio, headers);
  
  // BOM für Excel UTF-8 Kompatibilität
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  });
  
  downloadFile(blob, `${filename}.csv`);
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
