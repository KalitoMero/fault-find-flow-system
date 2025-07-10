
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getEmployees } from '@/lib/settingsStorage';

interface User {
  username: string;
  role: 'teamleader';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('teamleader');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Erst in den erstellten Mitarbeiter-Accounts suchen
    const employees = getEmployees();
    const employeeAccount = employees.find(emp => 
      emp.isTeamLeader && 
      emp.account && 
      emp.account.username === username && 
      emp.account.password === password
    );

    if (employeeAccount) {
      const user = { username, role: 'teamleader' as const };
      setUser(user);
      localStorage.setItem('teamleader', JSON.stringify(user));
      return true;
    }

    // Fallback zu den ursprünglichen Test-Accounts
    const fallbackAccount = fallbackTestAccounts.find(
      acc => acc.username === username && acc.password === password
    );

    if (fallbackAccount) {
      const user = { username, role: 'teamleader' as const };
      setUser(user);
      localStorage.setItem('teamleader', JSON.stringify(user));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('teamleader');
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
