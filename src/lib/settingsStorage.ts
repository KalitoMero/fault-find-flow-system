import api from '@/lib/apiClient';
import {
  getEmployees as getEmployeesFromMgmt,
  updateEmployee as updateEmployeeViaApi,
  deleteEmployee as deleteEmployeeViaApi,
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
  return api.get('/api/departments');
};

export const saveDepartment = async (department: Department): Promise<void> => {
  if (department.id) {
    await api.put(`/api/departments/${department.id}`, { name: department.name, code: department.code });
  } else {
    await api.post('/api/departments', { name: department.name, code: department.code });
  }
};

export const deleteDepartment = async (departmentId: string): Promise<void> => {
  await api.delete(`/api/departments/${departmentId}`);
};

// Employees
export const getEmployees = async (): Promise<Employee[]> => {
  return getEmployeesFromMgmt();
};

export const saveEmployee = async (employee: Employee): Promise<void> => {
  await updateEmployeeViaApi({
    id: employee.id,
    name: employee.name,
    departmentId: employee.departmentId,
    personalNumber: employee.account?.username,
    isTeamLeader: employee.isTeamLeader,
    isAdmin: employee.isAdmin,
  });
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  await deleteEmployeeViaApi(employeeId);
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
  return api.get('/api/machines');
};

export const saveMachine = async (machine: Machine): Promise<void> => {
  if (machine.id) {
    await api.put(`/api/machines/${machine.id}`, { name: machine.name });
  } else {
    await api.post('/api/machines', { name: machine.name });
  }
};

export const deleteMachine = async (machineId: string): Promise<void> => {
  await api.delete(`/api/machines/${machineId}`);
};

// Utility
export const generateId = () => crypto.randomUUID();

export const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Logo
export const getLogo = async (): Promise<string | null> => {
  try {
    const data = await api.get('/api/settings/logo');
    return data?.value || null;
  } catch {
    return null;
  }
};

export const setLogo = async (logoDataUrl: string): Promise<void> => {
  await api.put('/api/settings/logo', { value: logoDataUrl });
};

export const removeLogo = async (): Promise<void> => {
  await api.delete('/api/settings/logo');
};
