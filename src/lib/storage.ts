export interface ErrorReport {
  id: string;
  orderNumber: string;
  afoNumber: string;
  machine: string;
  defectiveQuantity: number;
  totalDefectiveQuantity: number;
  problemDescription: string;
  errorCause: string;
  correctiveAction: string;
  creator: string;
  personalNumber: string;
  createdAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  accessNumber: string;
  audioFiles?: {
    problemDescription?: string;
    errorCause?: string;
    correctiveAction?: string;
  };
  assignedTeamLeader: string;
  approvedBy?: string;
  approvedAt?: string;
}

import { getEmployees } from './settingsStorage';

export const getErrorReports = (): ErrorReport[] => {
  const stored = localStorage.getItem('production_error_reports');
  return stored ? JSON.parse(stored) : [];
};

export const saveErrorReport = (report: ErrorReport) => {
  const reports = getErrorReports();
  reports.push(report);
  localStorage.setItem('production_error_reports', JSON.stringify(reports));
};

export const updateErrorReportStatus = (
  reportId: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string,
  approvedBy?: string
) => {
  const reports = getErrorReports().map(report => {
    if (report.id === reportId) {
      const updatedReport = { 
        ...report, 
        approvalStatus: status, 
        rejectionReason: rejectionReason 
      };
      if (status === 'approved' && approvedBy) {
        updatedReport.approvedBy = approvedBy;
        updatedReport.approvedAt = new Date().toISOString();
      }
      return updatedReport;
    }
    return report;
  });
  localStorage.setItem('production_error_reports', JSON.stringify(reports));
};

export const updateErrorReport = (reportId: string, updatedReport: ErrorReport) => {
  const reports = getErrorReports().map(report => {
    if (report.id === reportId) {
      return updatedReport;
    }
    return report;
  });
  localStorage.setItem('production_error_reports', JSON.stringify(reports));
};

export const getErrorReportById = (reportId: string): ErrorReport | undefined => {
  const reports = getErrorReports();
  return reports.find(report => report.id === reportId);
};

export const getErrorReportByAccessNumber = (accessNumber: string): ErrorReport | undefined => {
  const reports = getErrorReports();
  return reports.find(report => report.accessNumber === accessNumber);
};

export const generateAccessNumber = (): string => {
  const existingReports = getErrorReports();
  const existingNumbers = existingReports.map(report => report.accessNumber);
  
  let newNumber;
  do {
    newNumber = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingNumbers.includes(newNumber));
  
  return newNumber;
};

export const generateErrorReportId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getErrorReportStatistics = () => {
  const reports = getErrorReports();
  const total = reports.length;
  const pending = reports.filter(report => report.approvalStatus === 'pending').length;
  const approved = reports.filter(report => report.approvalStatus === 'approved').length;
  const rejected = reports.filter(report => report.approvalStatus === 'rejected').length;

  return {
    total,
    pending,
    approved,
    rejected
  };
};

export const getErrorReportsForTeamLeader = (username: string): ErrorReport[] => {
  const reports = getErrorReports();
  const employees = getEmployees();
  
  // Finde den aktuellen Teamleiter
  const currentTeamLeader = employees.find(emp => 
    emp.isTeamLeader && emp.account?.username === username
  );
  
  if (!currentTeamLeader) {
    return [];
  }
  
  // Prüfe, ob eine Vertretung aktiv ist
  const deputyId = localStorage.getItem(`deputy_${username}`);
  let deputyUsername = null;
  
  if (deputyId) {
    const deputy = employees.find(emp => emp.id === deputyId);
    deputyUsername = deputy?.account?.username;
  }
  
  // Filtere Meldungen, die diesem Teamleiter oder seiner Vertretung zugewiesen sind
  return reports.filter(report => {
    // Meldungen die direkt dem Teamleiter zugewiesen sind
    if (report.assignedTeamLeader === username) {
      return true;
    }
    
    // Meldungen die der Vertretung zugewiesen sind (falls Vertretung aktiv)
    if (deputyUsername && report.assignedTeamLeader === deputyUsername) {
      return true;
    }
    
    return false;
  });
};

// Erweiterte Funktion für Vertretungs-Zugriff
export const getErrorReportsForDeputy = (deputyUsername: string): ErrorReport[] => {
  const reports = getErrorReports();
  const employees = getEmployees();
  
  // Finde alle Teamleiter, die diese Person als Vertretung haben
  const teamLeadersWithThisDeputy = employees.filter(emp => {
    if (!emp.isTeamLeader || !emp.account?.username) return false;
    
    const deputyId = localStorage.getItem(`deputy_${emp.account.username}`);
    if (!deputyId) return false;
    
    const deputy = employees.find(d => d.id === deputyId);
    return deputy?.account?.username === deputyUsername;
  });
  
  // Sammle alle Meldungen der Teamleiter, für die diese Person Vertretung ist
  const teamLeaderUsernames = teamLeadersWithThisDeputy.map(tl => tl.account!.username);
  
  return reports.filter(report => 
    teamLeaderUsernames.includes(report.assignedTeamLeader)
  );
};
