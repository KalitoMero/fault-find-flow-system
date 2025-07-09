
export interface Employee {
  id: string;
  name: string;
  departmentId: string;
}

export interface Department {
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

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};
