import { supabase } from '@/integrations/supabase/client';
import { normalizeResourceName } from './resourceUtils';

export interface TeamleaderResource {
  id: string;
  teamleader_id: string;
  resource_name: string;
  created_at: string;
}

/**
 * Holt alle Ressourcen-Zuordnungen für einen Teamleiter
 */
export const getTeamLeaderResources = async (teamLeaderId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('teamleader_resources')
    .select('resource_name')
    .eq('teamleader_id', teamLeaderId);
  
  if (error) throw error;
  return data?.map(r => r.resource_name) || [];
};

/**
 * Speichert Ressourcen-Zuordnungen für einen Teamleiter
 * Löscht alte Zuordnungen und fügt neue hinzu
 */
export const saveTeamLeaderResources = async (
  teamLeaderId: string, 
  resourceNames: string[]
): Promise<void> => {
  // Normalisierung
  const normalizedNames = resourceNames.map(normalizeResourceName);
  
  // Alte Zuordnungen löschen
  const { error: deleteError } = await supabase
    .from('teamleader_resources')
    .delete()
    .eq('teamleader_id', teamLeaderId);
  
  if (deleteError) throw deleteError;
  
  // Neue Zuordnungen einfügen
  if (normalizedNames.length > 0) {
    const { error: insertError } = await supabase
      .from('teamleader_resources')
      .insert(
        normalizedNames.map(name => ({
          teamleader_id: teamLeaderId,
          resource_name: name
        }))
      );
    
    if (insertError) throw insertError;
  }
};

/**
 * Findet ALLE Teamleiter-IDs für eine Ressource
 * (Eine Ressource kann mehreren Teamleitern zugeordnet sein)
 */
export const findTeamLeadersForResource = async (resourceName: string): Promise<string[]> => {
  const normalized = normalizeResourceName(resourceName);
  
  const { data, error } = await supabase
    .from('teamleader_resources')
    .select('teamleader_id')
    .eq('resource_name', normalized);
  
  if (error) throw error;
  return data?.map(r => r.teamleader_id) || [];
};

/**
 * Findet Teamleiter basierend auf Ressource, mit Fallback auf Abteilung
 */
export const findTeamLeaderForResourceOrDepartment = async (
  resourceName: string | null,
  departmentId: string | null
): Promise<string> => {
  // Versuch 1: Ressource
  if (resourceName) {
    const teamLeaders = await findTeamLeadersForResource(resourceName);
    if (teamLeaders.length > 0) {
      // Ersten Teamleiter zurückgeben (primäre Zuweisung)
      return teamLeaders[0];
    }
  }
  
  // Versuch 2: Fallback auf Abteilung
  if (departmentId) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_roles!inner(role)')
      .eq('department_id', departmentId);
    
    const teamLeader = profiles?.find((profile: any) => 
      profile.user_roles?.some((role: any) => role.role === 'teamleader')
    );
    
    if (teamLeader) {
      return teamLeader.id;
    }
  }
  
  return '';
};
