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
  resourceName?: string;
  approverName?: string;
  departmentName?: string;
  editedAt?: string;
  editedBy?: string;
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
    additionalExcelData: dbReport.additional_excel_data,
    resourceName: dbReport.resource_name,
    editedAt: dbReport.edited_at,
    editedBy: dbReport.edited_by_id
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
    additional_excel_data: report.additionalExcelData || null,
    edited_at: report.editedAt,
    edited_by_id: report.editedBy || null
  };
};

export const getErrorReports = async (): Promise<ErrorReport[]> => {
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const reports = (data || []).map(toCamelCase);
  
  // Load approver/rejecter names
  const userIds = new Set<string>();
  reports.forEach(r => {
    if (r.approvedBy) userIds.add(r.approvedBy);
    if (r.rejectedBy) userIds.add(r.rejectedBy);
  });
  
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', Array.from(userIds));
    
    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
    
    reports.forEach(r => {
      if (r.approvedBy && nameMap.has(r.approvedBy)) {
        r.approverName = nameMap.get(r.approvedBy);
      }
      if (r.rejectedBy && nameMap.has(r.rejectedBy) && !r.approverName) {
        r.approverName = nameMap.get(r.rejectedBy);
      }
    });
  }
  
  return reports;
};

const saveErrorReportWithRetry = async (
  report: ErrorReport,
  maxRetries: number = 3
): Promise<ErrorReport> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbReport = await toSnakeCase(report);
      const { data, error } = await supabase
        .from('error_reports')
        .insert([dbReport])
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Report saved successfully on attempt ${attempt}`);
        return toCamelCase(data); // Return the saved report
      }

      // If it's a duplicate key error and not the last attempt, use UUID
      if (error?.code === '23505' && attempt < maxRetries) {
        console.log(`🔄 Duplicate key detected, using UUID (attempt ${attempt}/${maxRetries})...`);
        // Use timestamp + random for unique ID instead of querying DB again
        const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        report.id = newId;
        lastError = error;
        continue; // Retry with UUID
      }

      // Other error or last attempt
      throw error;
      
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) {
        console.error('❌ All retry attempts failed:', err);
        throw err;
      }
    }
  }
  
  throw lastError;
};

export const saveErrorReport = async (report: ErrorReport): Promise<ErrorReport> => {
  try {
    return await saveErrorReportWithRetry(report, 3);
  } catch (error) {
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
    // Get ALL IDs from the database to sort numerically in JavaScript
    const { data, error } = await supabase
      .from('error_reports')
      .select('id');

    if (error) {
      console.error('Error fetching report IDs:', error);
      throw error;
    }

    let highestId = 0;
    
    // Sort numerically in JavaScript (not alphabetically like SQL does with TEXT columns)
    if (data && data.length > 0) {
      const numericIds = data
        .map(row => parseInt(row.id))
        .filter(id => !isNaN(id));
      
      if (numericIds.length > 0) {
        highestId = Math.max(...numericIds);
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
  // Get team leader's assigned resources
  const { data: resourceData } = await supabase
    .from('teamleader_resources')
    .select('resource_name')
    .eq('teamleader_id', userId);
  
  const assignedResources = resourceData?.map(r => r.resource_name) || [];
  
  // Get team leader's department
  const { data: profileData } = await supabase
    .from('profiles')
    .select('department_id')
    .eq('id', userId)
    .maybeSingle();
  
  const departmentId = profileData?.department_id;
  
  // Check for active deputy assignments
  const { data: deputyAssignments } = await supabase
    .from('deputy_assignments')
    .select('deputy_id')
    .eq('team_leader_id', userId)
    .eq('is_active', true);

  const deputyIds = deputyAssignments?.map(d => d.deputy_id) || [];

  // Build query
  let query = supabase
    .from('error_reports')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Filter by resources, department, or direct assignment
  const filters: string[] = [];
  
  if (assignedResources.length > 0) {
    filters.push(...assignedResources.map(r => `resource_name.eq.${r}`));
  }
  
  if (departmentId) {
    filters.push(`department_id.eq.${departmentId}`);
  }
  
  filters.push(`assigned_team_leader_id.eq.${userId}`);
  
  if (deputyIds.length > 0) {
    filters.push(...deputyIds.map(id => `assigned_team_leader_id.eq.${id}`));
  }
  
  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query;

  if (error) throw error;
  
  const reports = (data || []).map(toCamelCase);
  
  // Load approver/rejecter names
  const userIds = new Set<string>();
  reports.forEach(r => {
    if (r.approvedBy) userIds.add(r.approvedBy);
    if (r.rejectedBy) userIds.add(r.rejectedBy);
  });
  
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', Array.from(userIds));
    
    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
    
    reports.forEach(r => {
      if (r.approvedBy && nameMap.has(r.approvedBy)) {
        r.approverName = nameMap.get(r.approvedBy);
      }
      if (r.rejectedBy && nameMap.has(r.rejectedBy) && !r.approverName) {
        r.approverName = nameMap.get(r.rejectedBy);
      }
    });
  }
  
  return reports;
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
  const normalized = searchTerm.replace(/\s+/g, '').trim();

  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .ilike('order_number', `%${normalized}%`)
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

// ============= ADDITIONAL FUNCTIONS FROM SUPABASESTORAGE.TS =============

// Audio-Datei hochladen
export const uploadAudioFile = async (
  reportId: string,
  fieldName: string,
  audioBlob: Blob
): Promise<string> => {
  const fileName = `${reportId}_${fieldName}_${Date.now()}.webm`;
  const filePath = `${reportId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('audio-recordings')
    .upload(filePath, audioBlob, {
      contentType: 'audio/webm'
    });

  if (uploadError) throw uploadError;

  // Speichere Referenz in audio_files Tabelle
  const { error: dbError } = await supabase
    .from('audio_files')
    .insert({
      report_id: reportId,
      field_name: fieldName,
      storage_path: filePath
    });

  if (dbError) throw dbError;

  return filePath;
};

// Audio-Dateien für Report abrufen
export const getAudioFilesForReport = async (reportId: string) => {
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('report_id', reportId);

  if (error) throw error;

  // URLs für die Audio-Dateien generieren
  const filesWithUrls = await Promise.all(
    (data || []).map(async (file: any) => {
      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(file.storage_path);

      return {
        ...file,
        url: urlData.publicUrl
      };
    })
  );

  return filesWithUrls;
};

// Abteilungen abrufen
export const getDepartments = async () => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Maschinen abrufen
export const getMachines = async () => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Mitarbeiter einer Abteilung abrufen
export const getEmployeesByDepartment = async (departmentId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, personal_number')
    .eq('department_id', departmentId)
    .order('name');

  if (error) throw error;
  return data || [];
};

// Alle Profile abrufen (mit Rollen)
export const getProfiles = async () => {
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (profileError) throw profileError;

  // Rollen für alle Profile abrufen
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (roleError) throw roleError;

  // Profile mit Rollen anreichern
  return (profiles || []).map((profile: any) => {
    const userRoles = (roles || []).filter((r: any) => r.user_id === profile.id);
    return {
      ...profile,
      roles: userRoles.map((r: any) => r.role),
      isTeamLeader: userRoles.some((r: any) => r.role === 'teamleader'),
      isAdmin: userRoles.some((r: any) => r.role === 'admin')
    };
  });
};

// Profil aktualisieren
export const updateProfile = async (userId: string, updates: any) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
};

// Rolle hinzufügen
export const addUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role });

  if (error) throw error;
};

// Rolle entfernen
export const removeUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
};

// Abteilung erstellen
export const createDepartment = async (name: string) => {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Abteilung löschen
export const deleteDepartment = async (departmentId: string) => {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) throw error;
};

// Maschine erstellen
export const createMachine = async (name: string) => {
  const { data, error } = await supabase
    .from('machines')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Maschine löschen
export const deleteMachine = async (machineId: string) => {
  const { error } = await supabase
    .from('machines')
    .delete()
    .eq('id', machineId);

  if (error) throw error;
};

// Logo aus app_settings abrufen
export const getLogo = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'logo')
    .maybeSingle();

  if (error) throw error;
  return data?.value || null;
};

// Logo in app_settings speichern
export const saveLogo = async (logoDataUrl: string) => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'logo', value: logoDataUrl });

  if (error) throw error;
};

// Logo aus app_settings entfernen
export const removeLogo = async () => {
  const { error } = await supabase
    .from('app_settings')
    .delete()
    .eq('key', 'logo');

  if (error) throw error;
};
