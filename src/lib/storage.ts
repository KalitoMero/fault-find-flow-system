import { supabase } from '@/integrations/supabase/client';

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
}

// Helper: Convert snake_case to camelCase
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
    additionalExcelData: dbReport.additional_excel_data
  };
};

// Helper: Convert camelCase to snake_case
const toSnakeCase = async (report: Partial<ErrorReport>): Promise<any> => {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  
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
    creator_id: user?.id || null,
    creator_name: report.creator,
    personal_number: report.personalNumber,
    approval_status: report.approvalStatus,
    rejection_reason: report.rejectionReason,
    // assigned_team_leader_id should be a UUID or null
    assigned_team_leader_id: (report.assignedTeamLeader && report.assignedTeamLeader !== 'System') 
      ? report.assignedTeamLeader 
      : null,
    approved_by_id: report.approvedBy || null,
    approved_at: report.approvedAt,
    rejected_by_id: report.rejectedBy || null,
    rejected_at: report.rejectedAt,
    // department_id should be a UUID or null
    department_id: report.excelDepartment || null,
    additional_info: report.additionalInfo,
    additional_excel_data: report.additionalExcelData || null
  };
};

export const getErrorReports = async (): Promise<ErrorReport[]> => {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toCamelCase);
};

export const saveErrorReport = async (report: ErrorReport): Promise<void> => {
  const dbReport = await toSnakeCase(report);
  const { error } = await supabase
    .from('error_reports')
    .insert([dbReport]);

  if (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

export const deleteErrorReport = async (reportId: string): Promise<void> => {
  const { error } = await supabase
    .from('error_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
};

export const updateErrorReportStatus = async (
  reportId: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string,
  approvedBy?: string
): Promise<void> => {
  const updateData: any = {
    approval_status: status,
    rejection_reason: rejectionReason
  };

  if (status === 'approved') {
    updateData.approved_by_id = approvedBy;
    updateData.approved_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updateData.rejected_by_id = approvedBy;
    updateData.rejected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('error_reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) throw error;
};

export const updateErrorReport = async (reportId: string, updatedReport: ErrorReport): Promise<void> => {
  const dbReport = await toSnakeCase(updatedReport);
  const { error } = await supabase
    .from('error_reports')
    .update(dbReport)
    .eq('id', reportId);

  if (error) {
    console.error('Error updating report:', error);
    throw error;
  }
};

export const getErrorReportById = async (reportId: string): Promise<ErrorReport | undefined> => {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw error;
  return data ? toCamelCase(data) : undefined;
};

export const getErrorReportByOrderNumber = async (orderNumber: string): Promise<ErrorReport | undefined> => {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error) throw error;
  return data ? toCamelCase(data) : undefined;
};

export const generateErrorReportId = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('error_reports')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(20); // Get more records to ensure we find the highest numeric ID

    if (error) {
      console.error('Error fetching report IDs:', error);
      throw error;
    }

    // Find the highest numeric ID
    let highestId = 0;
    if (data && data.length > 0) {
      const numericIds = data
        .map((report: any) => parseInt(report.id))
        .filter((id: number) => !isNaN(id))
        .sort((a: number, b: number) => b - a);
      
      if (numericIds.length > 0) {
        highestId = numericIds[0];
      }
    }

    const newId = (highestId + 1).toString();
    console.log('Generated new ID:', newId, 'from highest:', highestId);
    
    return newId;
  } catch (err) {
    console.error('Error in generateErrorReportId:', err);
    throw new Error('Fehler beim Generieren der Berichts-ID: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
  }
};

export const getErrorReportStatistics = async () => {
  const reports = await getErrorReports();
  return {
    total: reports.length,
    pending: reports.filter(r => r.approvalStatus === 'pending').length,
    approved: reports.filter(r => r.approvalStatus === 'approved').length,
    rejected: reports.filter(r => r.approvalStatus === 'rejected').length
  };
};

export const getErrorReportsForTeamLeader = async (userId: string): Promise<ErrorReport[]> => {
  // Check for active deputy assignments
  const { data: deputyAssignments } = await supabase
    .from('deputy_assignments')
    .select('deputy_id')
    .eq('team_leader_id', userId)
    .eq('is_active', true);

  const deputyIds = deputyAssignments?.map(d => d.deputy_id) || [];

  // Get reports assigned to team leader or their deputies
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .or(`assigned_team_leader_id.eq.${userId}${deputyIds.length > 0 ? `,assigned_team_leader_id.in.(${deputyIds.join(',')})` : ''}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toCamelCase);
};

export const getErrorReportsForDeputy = async (deputyUserId: string): Promise<ErrorReport[]> => {
  // Get all team leaders this user is deputy for
  const { data: assignments, error: assignError } = await supabase
    .from('deputy_assignments')
    .select('team_leader_id, assigned_at')
    .eq('deputy_id', deputyUserId)
    .eq('is_active', true);

  if (assignError) throw assignError;
  if (!assignments || assignments.length === 0) return [];

  const teamLeaderIds = assignments.map(a => a.team_leader_id);
  const earliestAssignment = new Date(Math.min(...assignments.map(a => new Date(a.assigned_at).getTime())));

  // Get reports for those team leaders
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .in('assigned_team_leader_id', teamLeaderIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Filter by assignment time and approval status
  return (data || [])
    .filter((report: any) => {
      const reportDate = new Date(report.created_at);
      return reportDate >= earliestAssignment || 
             report.approval_status === 'pending' ||
             report.approved_by_id === deputyUserId;
    })
    .map(toCamelCase);
};

export const isUserDeputy = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('deputy_assignments')
    .select('id')
    .eq('deputy_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (error) return false;
  return (data?.length || 0) > 0;
};

export const searchErrorReportsByOrderNumber = async (searchTerm: string): Promise<ErrorReport[]> => {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .ilike('order_number', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
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
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, department_id');

  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'teamleader');

  const { data: departments } = await supabase
    .from('departments')
    .select('*');

  const teamLeaderIds = roles?.map(r => r.user_id) || [];
  const teamLeaders = profiles?.filter(p => teamLeaderIds.includes(p.id)) || [];

  const statistics = await Promise.all(
    teamLeaders.map(async (leader: any) => {
      const reports = await getErrorReportsForTeamLeader(leader.id);
      const department = departments?.find(d => d.id === leader.department_id);

      return {
        id: leader.id,
        username: leader.id,
        name: leader.name,
        department: department?.name || 'Unbekannte Abteilung',
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.approvalStatus === 'pending').length,
        approvedReports: reports.filter(r => r.approvalStatus === 'approved').length,
        rejectedReports: reports.filter(r => r.approvalStatus === 'rejected').length
      };
    })
  );

  return statistics;
};
