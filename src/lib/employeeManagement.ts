import api from '@/lib/apiClient';

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

export async function getEmployees(): Promise<Employee[]> {
  const profiles = await api.get('/api/profiles');
  return profiles.map((p: any) => ({
    id: p.id,
    name: p.name,
    departmentId: p.department_id || '',
    personalNumber: p.personal_number,
    isTeamLeader: p.isTeamLeader || false,
    isAdmin: p.isAdmin || false,
  }));
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
  // Register user via auth endpoint
  const data = await api.post('/api/auth/register', {
    email: employee.email,
    password: employee.password,
    name: employee.name,
    personalNumber: employee.personalNumber,
  });

  const userId = data.user.id;

  // Update department
  await api.put(`/api/profiles/${userId}`, {
    name: employee.name,
    personal_number: employee.personalNumber || null,
    department_id: employee.departmentId || null,
  });

  // Add roles
  if (employee.isTeamLeader) {
    await api.post('/api/roles', { userId, role: 'teamleader' });
  }
  if (employee.isAdmin) {
    await api.post('/api/roles', { userId, role: 'admin' });
  }

  return userId;
}

export async function updateEmployee(employee: {
  id: string;
  name: string;
  departmentId: string;
  personalNumber?: string;
  isTeamLeader?: boolean;
  isAdmin?: boolean;
}): Promise<void> {
  await api.put(`/api/profiles/${employee.id}`, {
    name: employee.name,
    personal_number: employee.personalNumber || null,
    department_id: employee.departmentId || null,
  });
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  // Note: Requires admin endpoint on backend to delete user
  await api.delete(`/api/profiles/${employeeId}`);
}
