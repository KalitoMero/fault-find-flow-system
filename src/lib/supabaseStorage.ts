import { supabase } from '@/integrations/supabase/client';

export interface ErrorReport {
  id: string;
  order_number: string;
  afo_number: string;
  machine_id?: string;
  defective_quantity: number;
  total_defective_quantity: number;
  quantity_type?: string;
  detection_location?: string;
  problem_description: string;
  error_cause: string;
  corrective_action: string;
  creator_id: string;
  creator_name: string;
  personal_number?: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  assigned_team_leader_id?: string;
  approved_by_id?: string;
  approved_at?: string;
  rejected_by_id?: string;
  rejected_at?: string;
  department_id?: string;
  additional_info?: string;
}

// Fehlermeldungen abrufen
export const getErrorReports = async (): Promise<ErrorReport[]> => {
  const { data, error } = await (supabase as any)
    .from('error_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Neue Fehlermeldung speichern
export const saveErrorReport = async (report: Partial<ErrorReport>) => {
  const { data, error } = await (supabase as any)
    .from('error_reports')
    .insert([report])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Fehlermeldung löschen
export const deleteErrorReport = async (reportId: string) => {
  const { error } = await (supabase as any)
    .from('error_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
};

// Fehlermeldungsstatus aktualisieren
export const updateErrorReportStatus = async (
  reportId: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string,
  approvedById?: string
) => {
  const updateData: any = {
    approval_status: status,
    rejection_reason: rejectionReason
  };

  if (status === 'approved') {
    updateData.approved_by_id = approvedById;
    updateData.approved_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updateData.rejected_by_id = approvedById;
    updateData.rejected_at = new Date().toISOString();
  }

  const { error } = await (supabase as any)
    .from('error_reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) throw error;
};

// Fehlermeldung aktualisieren
export const updateErrorReport = async (reportId: string, updatedReport: Partial<ErrorReport>) => {
  const { error } = await (supabase as any)
    .from('error_reports')
    .update(updatedReport)
    .eq('id', reportId);

  if (error) throw error;
};

// Einzelne Fehlermeldung abrufen
export const getErrorReportById = async (reportId: string): Promise<ErrorReport | null> => {
  const { data, error } = await (supabase as any)
    .from('error_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Fehlermeldungen für Teamleiter abrufen
export const getErrorReportsForTeamLeader = async (teamLeaderId: string): Promise<ErrorReport[]> => {
  const { data, error } = await (supabase as any)
    .from('error_reports')
    .select('*')
    .eq('assigned_team_leader_id', teamLeaderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Statistiken abrufen
export const getErrorReportStatistics = async () => {
  const reports = await getErrorReports();
  
  return {
    total: reports.length,
    pending: reports.filter(r => r.approval_status === 'pending').length,
    approved: reports.filter(r => r.approval_status === 'approved').length,
    rejected: reports.filter(r => r.approval_status === 'rejected').length
  };
};

// Teamleiter-Statistiken für Admin Dashboard
export const getTeamLeaderStatistics = async () => {
  const { data: profiles, error: profilesError } = await (supabase as any)
    .from('profiles')
    .select('id, name, department_id');

  if (profilesError) throw profilesError;

  const { data: roles, error: rolesError } = await (supabase as any)
    .from('user_roles')
    .select('user_id')
    .eq('role', 'teamleader');

  if (rolesError) throw rolesError;

  const teamLeaderIds = roles?.map((r: any) => r.user_id) || [];
  const teamLeaders = profiles?.filter((p: any) => teamLeaderIds.includes(p.id)) || [];

  const { data: departments, error: deptError } = await (supabase as any)
    .from('departments')
    .select('*');

  if (deptError) throw deptError;

  const statistics = await Promise.all(
    teamLeaders.map(async (leader: any) => {
      const reports = await getErrorReportsForTeamLeader(leader.id);
      const department = departments?.find((d: any) => d.id === leader.department_id);

      return {
        id: leader.id,
        name: leader.name,
        department: department?.name || 'Unbekannte Abteilung',
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.approval_status === 'pending').length
      };
    })
  );

  return statistics;
};

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
  const { error: dbError } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
    .from('departments')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Maschinen abrufen
export const getMachines = async () => {
  const { data, error } = await (supabase as any)
    .from('machines')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Mitarbeiter einer Abteilung abrufen
export const getEmployeesByDepartment = async (departmentId: string) => {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, name, personal_number')
    .eq('department_id', departmentId)
    .order('name');

  if (error) throw error;
  return data || [];
};

// Alle Profile abrufen (mit Rollen)
export const getProfiles = async () => {
  const { data: profiles, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('*')
    .order('name');

  if (profileError) throw profileError;

  // Rollen für alle Profile abrufen
  const { data: roles, error: roleError } = await (supabase as any)
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
  const { error } = await (supabase as any)
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
};

// Rolle hinzufügen
export const addUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  const { error } = await (supabase as any)
    .from('user_roles')
    .insert({ user_id: userId, role });

  if (error) throw error;
};

// Rolle entfernen
export const removeUserRole = async (userId: string, role: 'admin' | 'teamleader' | 'employee' | 'management') => {
  const { error } = await (supabase as any)
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
};

// Abteilung erstellen
export const createDepartment = async (name: string) => {
  const { data, error } = await (supabase as any)
    .from('departments')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Abteilung löschen
export const deleteDepartment = async (departmentId: string) => {
  const { error } = await (supabase as any)
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) throw error;
};

// Maschine erstellen
export const createMachine = async (name: string) => {
  const { data, error } = await (supabase as any)
    .from('machines')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Maschine löschen
export const deleteMachine = async (machineId: string) => {
  const { error } = await (supabase as any)
    .from('machines')
    .delete()
    .eq('id', machineId);

  if (error) throw error;
};

// Logo aus app_settings abrufen
export const getLogo = async (): Promise<string | null> => {
  const { data, error } = await (supabase as any)
    .from('app_settings')
    .select('value')
    .eq('key', 'logo')
    .maybeSingle();

  if (error) throw error;
  return data?.value || null;
};

// Logo in app_settings speichern
export const saveLogo = async (logoDataUrl: string) => {
  const { error } = await (supabase as any)
    .from('app_settings')
    .upsert({ key: 'logo', value: logoDataUrl });

  if (error) throw error;
};

// Logo aus app_settings entfernen
export const removeLogo = async () => {
  const { error } = await (supabase as any)
    .from('app_settings')
    .delete()
    .eq('key', 'logo');

  if (error) throw error;
};
