// Lokale Datenspeicherung für Offline-Betrieb
// In Produktionsumgebung würde dies durch eine echte Datenbank ersetzt

export interface ErrorReport {
  id: string;
  accessNumber: string; // Neue 6-stellige Zugriffsnummer
  orderNumber: string;
  afoNumber: string;
  defectiveQuantity: number;
  totalDefectiveQuantity: number;
  creator: string;
  personalNumber: string;
  machine: string;
  problemDescription: string;
  errorCause: string;
  correctiveAction: string;
  createdAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  assignedTeamLeader?: string;
  audioFiles?: {
    problemDescription?: string | null;
    errorCause?: string | null;
    correctiveAction?: string | null;
  };
}

const STORAGE_KEY = 'production_error_reports';
const COUNTER_KEY = 'error_report_counter';

// Initialisiere Zähler wenn nicht vorhanden
if (!localStorage.getItem(COUNTER_KEY)) {
  localStorage.setItem(COUNTER_KEY, '1000');
}

// Fortlaufende ID generieren
export const generateErrorReportId = (): string => {
  const currentCounter = parseInt(localStorage.getItem(COUNTER_KEY) || '1000');
  const nextId = currentCounter + 1;
  localStorage.setItem(COUNTER_KEY, nextId.toString());
  return nextId.toString().padStart(6, '0');
};

// Neue Funktion: 6-stellige Zugriffsnummer generieren
export const generateAccessNumber = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Alle Fehlermeldungen laden
export const getErrorReports = (): ErrorReport[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Fehler beim Laden der Fehlermeldungen:', error);
    return [];
  }
};

// Fehlermeldungen zur Freigabe laden (nur pending)
export const getErrorReportsForApproval = (): ErrorReport[] => {
  const allReports = getErrorReports();
  return allReports.filter(report => report.approvalStatus === 'pending');
};

// Fehlermeldungen für einen bestimmten Teamleiter laden
export const getErrorReportsForTeamLeader = (teamLeader: string): ErrorReport[] => {
  const allReports = getErrorReports();
  return allReports
    .filter(report => report.assignedTeamLeader === teamLeader)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Einzelne Fehlermeldung speichern
export const saveErrorReport = (report: ErrorReport): void => {
  try {
    const reports = getErrorReports();
    reports.push(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    
    // Service Worker für Offline-Sync informieren
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_ERROR_REPORT',
        data: report
      });
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Fehlermeldung:', error);
    throw new Error('Speichern fehlgeschlagen');
  }
};

// Freigabestatus aktualisieren
export const updateErrorReportStatus = (
  id: string, 
  status: 'approved' | 'rejected', 
  rejectionReason?: string
): void => {
  try {
    const reports = getErrorReports();
    const reportIndex = reports.findIndex(r => r.id === id);
    
    if (reportIndex === -1) {
      throw new Error('Fehlermeldung nicht gefunden');
    }

    reports[reportIndex].approvalStatus = status;
    
    if (status === 'approved') {
      reports[reportIndex].approvedAt = new Date().toISOString();
      reports[reportIndex].approvedBy = 'Team-/Schichtleiter'; // In echter App: aktueller Benutzer
    } else if (status === 'rejected' && rejectionReason) {
      reports[reportIndex].rejectionReason = rejectionReason;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    throw new Error('Status-Update fehlgeschlagen');
  }
};

// Einzelne Fehlermeldung laden
export const getErrorReportById = (id: string): ErrorReport | null => {
  const reports = getErrorReports();
  return reports.find(r => r.id === id) || null;
};

// Funktion zum Finden einer Meldung über Zugriffsnummer
export const getErrorReportByAccessNumber = (accessNumber: string): ErrorReport | null => {
  const reports = getErrorReports();
  return reports.find(r => r.accessNumber === accessNumber) || null;
};

// Statistiken berechnen
export const getErrorReportStatistics = (teamLeader?: string) => {
  const reports = teamLeader ? getErrorReportsForTeamLeader(teamLeader) : getErrorReports();
  const total = reports.length;
  const pending = reports.filter(r => r.approvalStatus === 'pending').length;
  const approved = reports.filter(r => r.approvalStatus === 'approved').length;
  const rejected = reports.filter(r => r.approvalStatus === 'rejected').length;

  // Auswertungen nach Maschine
  const byMachine = reports.reduce((acc, report) => {
    const machine = report.machine;
    if (!acc[machine]) {
      acc[machine] = { total: 0, approved: 0, pending: 0, rejected: 0 };
    }
    acc[machine].total++;
    acc[machine][report.approvalStatus]++;
    return acc;
  }, {} as Record<string, {total: number; approved: number; pending: number; rejected: number}>);

  // Auswertungen nach Monat
  const byMonth = reports.reduce((acc, report) => {
    const month = new Date(report.createdAt).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = 0;
    }
    acc[month]++;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    pending,
    approved,
    rejected,
    byMachine,
    byMonth
  };
};

// Demo-Daten erstellen (nur für Entwicklung)
export const createDemoData = (): void => {
  if (getErrorReports().length > 0) return; // Nur wenn keine Daten vorhanden

  const demoReports: ErrorReport[] = [
    {
      id: generateErrorReportId(),
      accessNumber: generateAccessNumber(),
      orderNumber: 'AUF-2024-001',
      afoNumber: 'AFO-12345',
      defectiveQuantity: 3,
      totalDefectiveQuantity: 100,
      creator: 'Hans Mueller',
      personalNumber: '54321',
      machine: 'Maschine 01 - CNC Drehmaschine',
      problemDescription: 'Oberflächenrauheit entspricht nicht den Vorgaben. Messungen zeigen Abweichungen von bis zu 0.2µm.',
      errorCause: 'Verschlissenes Werkzeug und falsche Schnittparameter. Kühlmittelzufuhr unzureichend.',
      correctiveAction: 'Werkzeug gewechselt, Schnittgeschwindigkeit reduziert, Kühlmittelflow erhöht. Probefertigung erfolgreich.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approvalStatus: 'approved',
      approvedBy: 'Test',
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTeamLeader: 'Test'
    },
    {
      id: generateErrorReportId(),
      accessNumber: generateAccessNumber(),
      orderNumber: 'AUF-2024-002',
      afoNumber: 'AFO-12346',
      defectiveQuantity: 5,
      totalDefectiveQuantity: 50,
      creator: 'Anna Schmidt',
      personalNumber: '54322',
      machine: 'Maschine 02 - Fräsmaschine',
      problemDescription: 'Maß-Abweichungen beim Fräsen. Toleranz von ±0.05mm wird überschritten.',
      errorCause: 'Spannvorrichtung nicht korrekt justiert. Werkstück rutscht während der Bearbeitung.',
      correctiveAction: 'Spannvorrichtung neu ausgerichtet und Klemmkraft erhöht. Werkstück-Fixierung überprüft.',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      approvalStatus: 'pending',
      assignedTeamLeader: 'Test2'
    },
    {
      id: generateErrorReportId(),
      accessNumber: generateAccessNumber(),
      orderNumber: 'AUF-2024-003',
      afoNumber: 'AFO-12347',
      defectiveQuantity: 2,
      totalDefectiveQuantity: 25,
      creator: 'Peter Weber',
      personalNumber: '54323',
      machine: 'Maschine 03 - Bohrmaschine',
      problemDescription: 'Bohrungen nicht mittig. Abweichung von bis zu 1mm festgestellt.',
      errorCause: 'Spannvorrichtung verschlissen, Werkzeug nicht korrekt zentriert.',
      correctiveAction: 'Neue Spannvorrichtung installiert, Werkzeug neu ausgerichtet und kalibriert.',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      approvalStatus: 'pending',
      assignedTeamLeader: 'Test'
    }
  ];

  demoReports.forEach(report => saveErrorReport(report));
};

// Beim Import Demo-Daten erstellen
if (typeof window !== 'undefined') {
  // Nur im Browser, nicht während Server-Side Rendering
  setTimeout(() => createDemoData(), 100);
}
