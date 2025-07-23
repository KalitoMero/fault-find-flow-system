
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getEmployees } from '@/lib/settingsStorage';

interface User {
  username: string;
  role: 'teamleader' | 'employee' | 'admin';
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback Test-Accounts falls keine Einstellungen vorhanden sind
const fallbackTestAccounts = [
  { username: 'Test', password: 'Test1' },
  { username: 'Test2', password: 'Test1' }
];

// Standard-Admin Account
const defaultAdminAccount = {
  username: 'admin',
  password: 'admin'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Erst in den erstellten Mitarbeiter-Accounts suchen
    const employees = getEmployees();
    const employeeAccount = employees.find(emp => 
      emp.account && 
      emp.account.username === username && 
      emp.account.password === password
    );

    if (employeeAccount) {
      let role: 'teamleader' | 'employee' | 'admin' = 'employee';
      if (employeeAccount.isAdmin) {
        role = 'admin';
      } else if (employeeAccount.isTeamLeader) {
        role = 'teamleader';
      }
      
      const user = { 
        username, 
        role,
        name: employeeAccount.name
      };
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }

    // Standard-Admin Account prüfen
    if (username === defaultAdminAccount.username && password === defaultAdminAccount.password) {
      const user = { 
        username, 
        role: 'admin' as const,
        name: 'Administrator'
      };
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }

    // Fallback zu den ursprünglichen Test-Accounts (diese sind immer Teamleiter)
    const fallbackAccount = fallbackTestAccounts.find(
      acc => acc.username === username && acc.password === password
    );

    if (fallbackAccount) {
      const user = { 
        username, 
        role: 'teamleader' as const,
        name: username
      };
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
