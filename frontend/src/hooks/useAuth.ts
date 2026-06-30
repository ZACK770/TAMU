import { useState, useEffect } from 'react';
import { authService } from '../services/auth';

export interface User {
  id: string;
  phone: string;
  fullName?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = authService.getAuth();
    if (auth.token && auth.user) {
      setUser(auth.user);
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    authService.saveAuth(token, userData);
    setUser(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return { user, loading, login, logout, isAuthenticated: !!user };
};
