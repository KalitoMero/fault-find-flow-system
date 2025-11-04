import { supabase } from '@/integrations/supabase/client';
import { 
  getEmployees as getEmployeesFromEdge,
  updateEmployee as updateEmployeeViaEdge,
  deleteEmployee as deleteEmployeeViaEdge,
  type Employee as EmployeeType
} from './employeeManagement';

export type Employee = EmployeeType;

export interface Department {
  id: string;
  name: string;
  code?: string;
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
    .upsert({ 
      id: department.id, 
      name: department.name,
      code: department.code 
    });

  if (error) throw error;
};

export const deleteDepartment = async (departmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) throw error;
};

// Employees (now via Edge Function for proper auth handling)
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    return await getEmployeesFromEdge();
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

export const saveEmployee = async (employee: Employee): Promise<void> => {
  try {
    await updateEmployeeViaEdge({
      id: employee.id,
      name: employee.name,
      departmentId: employee.departmentId,
      personalNumber: employee.account?.username,
      isTeamLeader: employee.isTeamLeader,
      isAdmin: employee.isAdmin
    });
  } catch (error) {
    console.error('Error saving employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    await deleteEmployeeViaEdge(employeeId);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
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
