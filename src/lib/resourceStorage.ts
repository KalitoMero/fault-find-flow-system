import api from '@/lib/apiClient';
import { normalizeResourceName } from './resourceUtils';

export interface TeamleaderResource {
  id: string;
  teamleader_id: string;
  resource_name: string;
  created_at: string;
}

export const getTeamLeaderResources = async (teamLeaderId: string): Promise<string[]> => {
  const data = await api.get(`/api/settings/resources/${teamLeaderId}`);
  return data?.map((r: any) => r.resource_name) || [];
};

export const saveTeamLeaderResources = async (
  teamLeaderId: string,
  resourceNames: string[]
): Promise<void> => {
  const normalizedNames = resourceNames.map(normalizeResourceName);
  await api.put(`/api/settings/resources/${teamLeaderId}`, {
    resources: normalizedNames,
  });
};

export const findTeamLeadersForResource = async (resourceName: string): Promise<string[]> => {
  const normalized = normalizeResourceName(resourceName);
  try {
    const data = await api.get(`/api/settings/resources/by-resource/${encodeURIComponent(normalized)}`);
    return data?.map((r: any) => r.teamleader_id) || [];
  } catch {
    return [];
  }
};

export const findTeamLeaderForResourceOrDepartment = async (
  resourceName: string | null,
  departmentId: string | null
): Promise<string> => {
  if (resourceName) {
    const teamLeaders = await findTeamLeadersForResource(resourceName);
    if (teamLeaders.length > 0) return teamLeaders[0];
  }

  if (departmentId) {
    try {
      const profiles = await api.get(`/api/profiles/by-department/${departmentId}`);
      // We need to check roles - for now return first profile
      // The server should provide this info
      const allProfiles = await api.get('/api/profiles');
      const teamLeader = allProfiles?.find((p: any) =>
        p.department_id === departmentId && p.isTeamLeader
      );
      if (teamLeader) return teamLeader.id;
    } catch {
      // ignore
    }
  }

  return '';
};
