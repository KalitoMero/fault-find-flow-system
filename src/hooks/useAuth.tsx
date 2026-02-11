import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import api from '@/lib/apiClient';

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  personal_number?: string;
  department_id?: string;
  role: 'admin' | 'teamleader' | 'employee' | 'management';
}

// App User interface
interface AppUser {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: any | null;
  profile: UserProfile | null;
  login: (username: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await api.get('/api/auth/me');
      const u = data.user;
      const roles: string[] = data.roles || [];

      setUser({ id: u.id, email: u.email });
      setProfile({
        id: u.id,
        name: u.name,
        email: u.email,
        personal_number: u.personal_number || undefined,
        department_id: u.department_id || undefined,
        role: (roles[0] || 'employee') as any,
      });
    } catch (error) {
      console.error('Error loading user:', error);
      // Token ungültig → ausloggen
      api.setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const login = async (usernameOrPersonalNumber: string, password: string) => {
    const credential = usernameOrPersonalNumber.trim();
    const isLikelyPersonalNumber = /^\d+$/.test(credential) || credential.includes('-') || credential.includes('_');

    try {
      let data: any;

      if (isLikelyPersonalNumber) {
        data = await api.post('/api/auth/login-with-credential', {
          personalNumber: credential,
          name: password, // Bei Personalnummer-Login ist password = Name
        });
      } else {
        // Standard-Login mit Email
        const email = credential.includes('@') ? credential : `${credential.toLowerCase()}@app.internal`;
        data = await api.post('/api/auth/login', { email, password });
      }

      if (data.token) {
        api.setToken(data.token);
        setUser({ id: data.user.id, email: data.user.email });
        setProfile({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: (data.user.roles?.[0] || 'employee') as any,
        });
        return { error: null };
      }

      return { error: new Error('Kein Token erhalten') };
    } catch (error) {
      return { error };
    }
  };

  const logout = async () => {
    api.setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { token: api.getToken() } : null,
      profile,
      login,
      logout,
      isAuthenticated: !!user && !!profile,
      loading
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
