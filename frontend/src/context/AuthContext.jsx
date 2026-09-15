import React, { createContext, useContext, useState } from 'react';
import * as authService from '../services/auth.service';
import { tokenStorage } from '../services/api';
import { createLogger } from '../utils/logger';

const AuthContext = createContext(null);
const logger = createLogger('frontend.authContext');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStorage.getUser());

  const login = async (email, password) => {
    const faculty = await authService.login({ email, password });
    setUser(faculty);
    logger.info('login.success', { userId: faculty?.id, role: faculty?.role });
    return faculty;
  };

  const signup = async payload => {
    const faculty = await authService.signup(payload);
    setUser(faculty);
    logger.info('signup.success', { userId: faculty?.id });
    return faculty;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    logger.info('logout');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
