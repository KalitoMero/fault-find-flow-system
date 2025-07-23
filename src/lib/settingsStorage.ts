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

export const getDepartments = (): Department[] => {
  const stored = localStorage.getItem('departments');
  return stored ? JSON.parse(stored) : [];
};

export const saveDepartment = (department: Department) => {
  const departments = getDepartments();
  const existingIndex = departments.findIndex(d => d.id === department.id);
  
  if (existingIndex >= 0) {
    departments[existingIndex] = department;
  } else {
    departments.push(department);
  }
  
  localStorage.setItem('departments', JSON.stringify(departments));
};

export const deleteDepartment = (departmentId: string) => {
  const departments = getDepartments().filter(d => d.id !== departmentId);
  localStorage.setItem('departments', JSON.stringify(departments));
  
  // Also remove employees from this department
  const employees = getEmployees().filter(e => e.departmentId !== departmentId);
  localStorage.setItem('employees', JSON.stringify(employees));
};

export const getEmployees = (): Employee[] => {
  const stored = localStorage.getItem('employees');
  return stored ? JSON.parse(stored) : [];
};

export const saveEmployee = (employee: Employee) => {
  const employees = getEmployees();
  const existingIndex = employees.findIndex(e => e.id === employee.id);
  
  if (existingIndex >= 0) {
    employees[existingIndex] = employee;
  } else {
    employees.push(employee);
  }
  
  localStorage.setItem('employees', JSON.stringify(employees));
};

export const deleteEmployee = (employeeId: string) => {
  const employees = getEmployees().filter(e => e.id !== employeeId);
  localStorage.setItem('employees', JSON.stringify(employees));
};

export const getEmployeesByDepartment = (departmentId: string): Employee[] => {
  return getEmployees().filter(e => e.departmentId === departmentId);
};

export const getTeamLeadersByDepartment = (departmentId: string): Employee[] => {
  return getEmployees().filter(e => e.departmentId === departmentId && e.isTeamLeader);
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getMachines = (): Machine[] => {
  const stored = localStorage.getItem('production_machines');
  return stored ? JSON.parse(stored) : [];
};

export const saveMachine = (machine: Machine) => {
  const machines = getMachines();
  const existingIndex = machines.findIndex(m => m.id === machine.id);
  
  if (existingIndex >= 0) {
    machines[existingIndex] = machine;
  } else {
    machines.push(machine);
  }
  
  localStorage.setItem('production_machines', JSON.stringify(machines));
};

export const deleteMachine = (machineId: string) => {
  const machines = getMachines().filter(m => m.id !== machineId);
  localStorage.setItem('production_machines', JSON.stringify(machines));
};

// Settings password management
export const getSettingsPassword = (): string => {
  return localStorage.getItem('settings_password') || 'admin';
};

export const setSettingsPassword = (password: string) => {
  localStorage.setItem('settings_password', password);
};

// Initialize default admin if not exists
export const initializeDefaultAdmin = () => {
  const employees = getEmployees();
  const defaultAdminExists = employees.find(emp => 
    emp.isAdmin && emp.account?.username === 'admin'
  );

  if (!defaultAdminExists) {
    const defaultAdmin: Employee = {
      id: generateId(),
      name: 'Administrator',
      departmentId: 'admin',
      isTeamLeader: false,
      isAdmin: true,
      account: {
        username: 'admin',
        email: 'admin@admin.local',
        password: 'admin'
      }
    };
    saveEmployee(defaultAdmin);
  }
};
