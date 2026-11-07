import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/auth.service';
import { tokenStorage, bootstrapSession } from '../services/api';
import { createLogger } from '../utils/logger';

const AuthContext = createContext(null);
const logger = createLogger('frontend.authContext');

export function AuthProvider({ children }) {
  // Seed from the remembered user so the UI can render the correct
  // shell on first paint (role-based routes, header avatar) without
  // waiting for the refresh round-trip to finish. If the refresh
  // later fails, we clear this.
  const [user, setUser] = useState(() => tokenStorage.getUser());
  // `booting` is true while we're rehydrating the in-memory access
  // token from the httpOnly refresh cookie. We skip bootstrap entirely
  // when no stored user exists, so anonymous visitors (Landing /
  // public profile / login) render instantly without a flash.
  const [booting, setBooting] = useState(() => Boolean(tokenStorage.getUser()));

  useEffect(() => {
    if (!booting) return;
    let cancelled = false;
    (async () => {
      const fresh = await bootstrapSession();
      if (cancelled) return;
      // null means the refresh cookie was missing or expired. Treat as
      // logged out — clear local state and let ProtectedRoute redirect
      // if the user hits an authenticated path.
      setUser(fresh);
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <AuthContext.Provider
      value={{ user, login, signup, logout, booting, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
