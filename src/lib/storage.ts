import api from '@/lib/apiClient';

export interface ErrorReport {
  id: string;
  orderNumber: string;
  afoNumber: string;
  machine: string;
  defectiveQuantity: number;
  totalDefectiveQuantity: number;
  quantityType?: string;
  detectionLocation?: string;
  problemDescription: string;
  errorCause: string;
  correctiveAction: string;
  creator: string;
  personalNumber: string;
  createdAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  audioFiles?: {
    problemDescription?: string;
    errorCause?: string;
    correctiveAction?: string;
  };
  assignedTeamLeader: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  excelDepartment?: string;
  additionalExcelData?: Record<string, any>;
  additionalInfo?: string;
  resourceName?: string;
  approverName?: string;
  departmentName?: string;
  editedAt?: string;
  editedBy?: string;
}

// Helper: Convert DB row (snake_case) to camelCase
const toCamelCase = (dbReport: any): ErrorReport => {
  return {
    id: dbReport.id,
    orderNumber: dbReport.order_number,
    afoNumber: dbReport.afo_number,
    machine: dbReport.machine_id || '',
    defectiveQuantity: dbReport.defective_quantity,
    totalDefectiveQuantity: dbReport.total_defective_quantity,
    quantityType: dbReport.quantity_type,
    detectionLocation: dbReport.detection_location,
    problemDescription: dbReport.problem_description,
    errorCause: dbReport.error_cause,
    correctiveAction: dbReport.corrective_action,
    creator: dbReport.creator_name,
    personalNumber: dbReport.personal_number,
    createdAt: dbReport.created_at,
    approvalStatus: dbReport.approval_status,
    rejectionReason: dbReport.rejection_reason,
    assignedTeamLeader: dbReport.assigned_team_leader_id || '',
    approvedBy: dbReport.approved_by_id,
    approvedAt: dbReport.approved_at,
    rejectedBy: dbReport.rejected_by_id,
    rejectedAt: dbReport.rejected_at,
    excelDepartment: dbReport.department_id,
    additionalInfo: dbReport.additional_info,
    additionalExcelData: dbReport.additional_excel_data,
    resourceName: dbReport.resource_name,
    approverName: dbReport.approver_name,
    editedAt: dbReport.edited_at,
    editedBy: dbReport.edited_by_id,
  };
};

// Helper: Convert camelCase to snake_case for API
const toSnakeCase = (report: Partial<ErrorReport>): any => {
  return {
    id: report.id,
    order_number: report.orderNumber,
    afo_number: report.afoNumber,
    machine_id: report.machine || null,
    defective_quantity: report.defectiveQuantity,
    total_defective_quantity: report.totalDefectiveQuantity,
    quantity_type: report.quantityType,
    detection_location: report.detectionLocation,
    problem_description: report.problemDescription,
    error_cause: report.errorCause,
    corrective_action: report.correctiveAction,
    creator_name: report.creator,
    personal_number: report.personalNumber,
    approval_status: report.approvalStatus,
    rejection_reason: report.rejectionReason,
    assigned_team_leader_id: (report.assignedTeamLeader && report.assignedTeamLeader !== 'System')
      ? report.assignedTeamLeader
      : null,
    approved_by_id: report.approvedBy || null,
    approved_at: report.approvedAt,
    rejected_by_id: report.rejectedBy || null,
    rejected_at: report.rejectedAt,
    department_id: report.excelDepartment || null,
    additional_info: report.additionalInfo,
    additional_excel_data: report.additionalExcelData || null,
    resource_name: report.resourceName,
    edited_at: report.editedAt,
    edited_by_id: report.editedBy || null,
  };
};

export const getErrorReports = async (): Promise<ErrorReport[]> => {
  const data = await api.get('/api/error-reports');
  return (data || []).map(toCamelCase);
};

export const saveErrorReport = async (report: ErrorReport): Promise<ErrorReport> => {
  const dbReport = toSnakeCase(report);
  const data = await api.post('/api/error-reports', dbReport);
  return toCamelCase(data);
};

export const deleteErrorReport = async (reportId: string): Promise<void> => {
  await api.delete(`/api/error-reports/${reportId}`);
};

export const updateErrorReportStatus = async (
  reportId: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string,
  _approvedBy?: string
): Promise<void> => {
  await api.patch(`/api/error-reports/${reportId}/status`, {
    status,
    rejectionReason,
  });
};

export const updateErrorReport = async (reportId: string, updatedReport: ErrorReport): Promise<void> => {
  const dbReport = toSnakeCase(updatedReport);
  await api.put(`/api/error-reports/${reportId}`, dbReport);
};

export const getErrorReportById = async (reportId: string): Promise<ErrorReport | undefined> => {
  try {
    const data = await api.get(`/api/error-reports/${reportId}`);
    return data ? toCamelCase(data) : undefined;
  } catch {
    return undefined;
  }
};

export const getErrorReportByOrderNumber = async (orderNumber: string): Promise<ErrorReport | undefined> => {
  try {
    const results = await api.get(`/api/error-reports/search/order/${encodeURIComponent(orderNumber)}`);
    return results?.length > 0 ? toCamelCase(results[0]) : undefined;
  } catch {
    return undefined;
  }
};

export const generateErrorReportId = async (): Promise<string> => {
  const data = await api.get('/api/error-reports/next-id');
  return data.nextId;
};

export const getErrorReportStatistics = async () => {
  const data = await api.get('/api/error-reports/statistics/overview');
  return {
    total: parseInt(data.total),
    pending: parseInt(data.pending),
    approved: parseInt(data.approved),
    rejected: parseInt(data.rejected),
  };
};

export const getErrorReportsForTeamLeader = async (_userId: string): Promise<ErrorReport[]> => {
  const data = await api.get('/api/error-reports/for-teamleader');
  return (data || []).map(toCamelCase);
};

export const getErrorReportsForDeputy = async (_deputyUserId: string): Promise<ErrorReport[]> => {
  // Deputy-Reports werden jetzt im Teamleader-Endpoint mitgeliefert
  const data = await api.get('/api/error-reports/for-teamleader');
  return (data || []).map(toCamelCase);
};

export const isUserDeputy = async (_userId: string): Promise<boolean> => {
  try {
    const deputies = await api.get('/api/settings/deputies/list');
    return deputies?.length > 0;
  } catch {
    return false;
  }
};

export const searchErrorReportsByOrderNumber = async (searchTerm: string): Promise<ErrorReport[]> => {
  const data = await api.get(`/api/error-reports/search/order/${encodeURIComponent(searchTerm)}`);
  return (data || []).map(toCamelCase);
};

export const searchErrorReportsByArticleNumber = async (searchTerm: string): Promise<ErrorReport[]> => {
  const reports = await getErrorReports();
  return reports.filter(report =>
    report.additionalExcelData?.Artikelnummer?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const searchErrorReportsByArticleDescription = async (searchTerm: string): Promise<ErrorReport[]> => {
  const reports = await getErrorReports();
  return reports.filter(report =>
    report.additionalExcelData?.Artikelbezeichnung?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const getTeamLeaderStatistics = async () => {
  const profiles = await getProfiles();
  const teamLeaders = profiles.filter((p: any) => p.isTeamLeader);

  const statistics = await Promise.all(
    teamLeaders.map(async (leader: any) => {
      const reports = await getErrorReportsForTeamLeader(leader.id);
      return {
        id: leader.id,
        username: leader.id,
        name: leader.name,
        department: leader.department_name || 'Unbekannte Abteilung',
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.approvalStatus === 'pending').length,
        approvedReports: reports.filter(r => r.approvalStatus === 'approved').length,
        rejectedReports: reports.filter(r => r.approvalStatus === 'rejected').length,
      };
    })
  );
  return statistics;
};

// ============= AUDIO =============

export const uploadAudioFile = async (
  reportId: string,
  fieldName: string,
  audioBlob: Blob
): Promise<string> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, `${reportId}_${fieldName}.webm`);
  formData.append('reportId', reportId);
  formData.append('fieldName', fieldName);

  const data = await api.upload('/api/upload/audio', formData);
  return data.path;
};

export const getAudioFilesForReport = async (reportId: string) => {
  return api.get(`/api/upload/audio/${reportId}`);
};

// ============= DEPARTMENTS, MACHINES, PROFILES =============

export const getDepartments = async () => {
  return api.get('/api/departments');
};

export const getMachines = async () => {
  return api.get('/api/machines');
};

export const getEmployeesByDepartment = async (departmentId: string) => {
  return api.get(`/api/profiles/by-department/${departmentId}`);
};

export const getProfiles = async () => {
  return api.get('/api/profiles');
};

export const updateProfile = async (userId: string, updates: any) => {
  await api.put(`/api/profiles/${userId}`, updates);
};

export const addUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  await api.post('/api/roles', { userId, role });
};

export const removeUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  await api.delete('/api/roles', { userId, role });
};

export const createDepartment = async (name: string) => {
  return api.post('/api/departments', { name });
};

export const deleteDepartment = async (departmentId: string) => {
  await api.delete(`/api/departments/${departmentId}`);
};

export const createMachine = async (name: string) => {
  return api.post('/api/machines', { name });
};

export const deleteMachine = async (machineId: string) => {
  await api.delete(`/api/machines/${machineId}`);
};

// ============= SETTINGS =============

export const getLogo = async (): Promise<string | null> => {
  try {
    const data = await api.get('/api/settings/logo');
    return data?.value || null;
  } catch {
    return null;
  }
};

export const saveLogo = async (logoDataUrl: string) => {
  await api.put('/api/settings/logo', { value: logoDataUrl });
};

export const removeLogo = async () => {
  await api.delete('/api/settings/logo');
};
