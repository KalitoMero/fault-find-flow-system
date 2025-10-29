import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  name: string;
  departmentId: string;
  personalNumber?: string;
  isTeamLeader?: boolean;
  isAdmin?: boolean;
  account?: {
    username: string;
    email: string;
    password: string;
  };
}

const EDGE_FUNCTION_URL = 'https://fzyohssalaivehujkngi.supabase.co/functions/v1/manage-employees';

async function callEdgeFunction(action: string, data?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export async function getEmployees(): Promise<Employee[]> {
  const result = await callEdgeFunction('list');
  return result.employees;
}

export async function createEmployee(employee: {
  name: string;
  departmentId: string;
  email: string;
  password: string;
  personalNumber?: string;
  isTeamLeader?: boolean;
  isAdmin?: boolean;
}): Promise<string> {
  const result = await callEdgeFunction('create', employee);
  return result.userId;
}

export async function updateEmployee(employee: {
  id: string;
  name: string;
  departmentId: string;
  personalNumber?: string;
  isTeamLeader?: boolean;
  isAdmin?: boolean;
}): Promise<void> {
  await callEdgeFunction('update', employee);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await callEdgeFunction('delete', { id: employeeId });
}
