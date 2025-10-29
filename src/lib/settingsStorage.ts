import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  name: string;
  departmentId: string;
  isTeamLeader?: boolean;
  isAdmin?: boolean;
  account?: {
    username: string;
    email: string;
    password: string;
  };
}

export interface Department {
  id: string;
  name: string;
}

export interface Machine {
  id: string;
  name: string;
}

// Departments
export const getDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

export const saveDepartment = async (department: Department): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .upsert({ id: department.id, name: department.name });

  if (error) throw error;
};

export const deleteDepartment = async (departmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) throw error;
};

// Employees (mapped from profiles + user_roles)
export const getEmployees = async (): Promise<Employee[]> => {
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (profileError) throw profileError;

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (roleError) throw roleError;

  // Get auth users for email/username
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

  return (profiles || []).map((profile: any) => {
    const userRoles = (roles || []).filter((r: any) => r.user_id === profile.id);
    const authUser = users?.find((u: any) => u.id === profile.id);

    return {
      id: profile.id,
      name: profile.name,
      departmentId: profile.department_id || '',
      isTeamLeader: userRoles.some((r: any) => r.role === 'teamleader'),
      isAdmin: userRoles.some((r: any) => r.role === 'admin'),
      account: authUser ? {
        username: authUser.email?.split('@')[0] || '',
        email: authUser.email || '',
        password: '********'
      } : undefined
    };
  });
};

export const saveEmployee = async (employee: Employee): Promise<void> => {
  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: employee.id,
      name: employee.name,
      department_id: employee.departmentId,
      personal_number: employee.account?.username
    });

  if (profileError) throw profileError;

  // Update roles
  const { error: deleteRolesError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', employee.id);

  if (deleteRolesError) throw deleteRolesError;

  const rolesToInsert: any[] = [];
  if (employee.isAdmin) rolesToInsert.push({ user_id: employee.id, role: 'admin' });
  if (employee.isTeamLeader) rolesToInsert.push({ user_id: employee.id, role: 'teamleader' });
  if (!employee.isAdmin && !employee.isTeamLeader) {
    rolesToInsert.push({ user_id: employee.id, role: 'employee' });
  }

  if (rolesToInsert.length > 0) {
    const { error: insertRolesError } = await supabase
      .from('user_roles')
      .insert(rolesToInsert);

    if (insertRolesError) throw insertRolesError;
  }
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  // Delete roles first
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', employeeId);

  // Delete profile
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', employeeId);

  if (error) throw error;
};

export const getEmployeesByDepartment = async (departmentId: string): Promise<Employee[]> => {
  const allEmployees = await getEmployees();
  return allEmployees.filter(e => e.departmentId === departmentId);
};

export const getTeamLeadersByDepartment = async (departmentId: string): Promise<Employee[]> => {
  const allEmployees = await getEmployees();
  return allEmployees.filter(e => e.departmentId === departmentId && e.isTeamLeader);
};

// Machines
export const getMachines = async (): Promise<Machine[]> => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

export const saveMachine = async (machine: Machine): Promise<void> => {
  const { error } = await supabase
    .from('machines')
    .upsert({ id: machine.id, name: machine.name });

  if (error) throw error;
};

export const deleteMachine = async (machineId: string): Promise<void> => {
  const { error } = await supabase
    .from('machines')
    .delete()
    .eq('id', machineId);

  if (error) throw error;
};

// Utility functions
export const generateId = () => {
  return crypto.randomUUID();
};

export const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Logo management
export const getLogo = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'logo')
    .maybeSingle();

  if (error) throw error;
  return data?.value || null;
};

export const setLogo = async (logoDataUrl: string): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'logo', value: logoDataUrl });

  if (error) throw error;
};

export const removeLogo = async (): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .delete()
    .eq('key', 'logo');

  if (error) throw error;
};
