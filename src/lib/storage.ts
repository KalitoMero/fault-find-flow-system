
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
      if (status === 'approved') {
        updatedReport.approvedBy = approvedBy || report.assignedTeamLeader;
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

// Erweiterte Funktion für Vertretungs-Zugriff mit Zeitfilter
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
  
  if (teamLeaderUsernames.length === 0) {
    return [];
  }
  
  // Ermittle den frühesten Zeitpunkt der Vertretungsernennung
  let earliestAssignmentTime: Date | null = null;
  
  teamLeaderUsernames.forEach(teamLeaderUsername => {
    const assignmentTimeStr = localStorage.getItem(`deputy_assignment_time_${teamLeaderUsername}`);
    if (assignmentTimeStr) {
      const assignmentTime = new Date(assignmentTimeStr);
      if (!earliestAssignmentTime || assignmentTime < earliestAssignmentTime) {
        earliestAssignmentTime = assignmentTime;
      }
    }
  });
  
  return reports.filter(report => {
    // Muss einem der Teamleiter zugewiesen sein, für die diese Person Vertretung ist
    if (!teamLeaderUsernames.includes(report.assignedTeamLeader)) {
      return false;
    }
    
    const reportCreatedAt = new Date(report.createdAt);
    
    // Zeige Meldungen die:
    // 1. Nach der Vertretungsernennung erstellt wurden ODER
    // 2. Noch zur Prüfung anstehen (pending) ODER
    // 3. Von dieser Vertretung freigegeben/abgelehnt wurden (auch wenn sie älter sind)
    if (earliestAssignmentTime) {
      return reportCreatedAt >= earliestAssignmentTime || 
             report.approvalStatus === 'pending' ||
             report.approvedBy === getEmployeeNameByUsername(deputyUsername);
    } else {
      // Fallback: nur pending-Meldungen und von Vertretung bearbeitete wenn kein Ernennungszeitpunkt gefunden
      return report.approvalStatus === 'pending' ||
             report.approvedBy === getEmployeeNameByUsername(deputyUsername);
    }
  });
};

// Hilfsfunktion um Mitarbeiternamen anhand des Benutzernamens zu finden
const getEmployeeNameByUsername = (username: string): string | undefined => {
  const employees = getEmployees();
  const employee = employees.find(emp => emp.account?.username === username);
  return employee?.name;
};

// Hilfsfunktion um zu prüfen ob ein Benutzer als Vertretung eingetragen ist
export const isUserDeputy = (username: string): boolean => {
  const employees = getEmployees();
  
  // Durchsuche alle Teamleiter und prüfe ob dieser Benutzer als Vertretung eingetragen ist
  const teamLeaders = employees.filter(emp => emp.isTeamLeader && emp.account?.username);
  
  for (const teamLeader of teamLeaders) {
    const deputyId = localStorage.getItem(`deputy_${teamLeader.account!.username}`);
    if (deputyId) {
      const deputy = employees.find(emp => emp.id === deputyId);
      if (deputy?.account?.username === username) {
        return true;
      }
    }
  }
  
  return false;
};
