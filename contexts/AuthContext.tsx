'use client';

/**
 * AuthContext - Authentication State Management (cookie-only)
 *
 * The browser never reads JWTs. Authentication is driven entirely by httpOnly,
 * Secure, SameSite cookies set by the server. On mount we ask the server
 * (/api/authentication/session) whether a valid session exists and restore the
 * user from there. Refresh is server-driven: the API client triggers a refresh
 * which the server answers by issuing new cookies. There is no client token
 * storage.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import { authApi, type SessionUser } from '@/lib/api/auth';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

function mapLoginUser(u: LoginUserShape | undefined): AuthUser | null {
  if (!u) return null;
  return { id: u.id, email: u.email, role: u.role, firstName: u.firstName, lastName: u.lastName };
}

function mapSessionUser(u: SessionUser): AuthUser {
  return { id: u.id, email: u.email, role: u.role, firstName: u.firstName, lastName: u.lastName, status: u.status };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Single refresh provider. Cookie-driven: the server reads the httpOnly
  // refresh cookie and issues new cookies; the client never sees a JWT.
  useEffect(() => {
    apiClient.setRefreshTokenProvider(async () => {
      const res = await authApi.refreshToken();
      if (!res.success) throw new Error(res.error || 'Session refresh failed');
    });
  }, []);

  // Session restoration on mount / page refresh.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authApi.getSession();
        if (active && res.success && res.data) {
          setUser(mapSessionUser(res.data));
        }
      } catch {
        // Stay unauthenticated.
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (!res.success) {
        const err = new Error(res.error || 'Login failed');
        (err as any).status = (res as any).status ?? 0;
        (err as any).retryAfterSeconds = (res as any).retryAfterSeconds;
        throw err;
      }
      const mapped = mapLoginUser(res.data.user)!;
      setUser(mapped);
      return mapped;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setUser(null);
    // Fire server-side revocation (revokes refresh token + clears cookies).
    // Fire-and-forget: state is already cleared locally.
    await authApi.logout().catch(() => {});
    window.location.href = '/login';
    setIsLoggingOut(false);
  }, []);

  const refreshToken = useCallback(async () => {
    const res = await authApi.refreshToken();
    if (!res.success) {
      setUser(null);
      throw new Error(res.error || 'Session refresh failed');
    }
  }, []);

  const isAuthenticated = useMemo(() => {
    if (isLoggingOut) return false;
    return !!user;
  }, [user, isLoggingOut]);

  const value = useMemo(
    () => ({ user, isAuthenticated, isLoading, isLoggingOut, login, logout, refreshToken }),
    [user, isAuthenticated, isLoading, isLoggingOut, login, logout, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Shape returned in the login response `user` field. */
interface LoginUserShape {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  mustPersonalize?: boolean;
}
