'use client';

/**
 * AuthContext - Authentication State Management
 *
 * Clean implementation with proper logout handling to prevent flicker.
 * Auth tokens live in HttpOnly cookies; localStorage only keeps the user profile.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authApi } from '@/lib/api/auth';
import { tokenStorage, type StoredUser } from '@/lib/auth/token';
import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
    user: StoredUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoggingOut: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Helper Functions (Single Responsibility)
// ============================================================================

function configureApiClient(): void {
    // Prefer a legacy localStorage token when present; otherwise cookies carry auth.
    apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
    apiClient.setRefreshTokenProvider(async () => {
        const response = await authApi.refreshToken();
        if (!response.success) {
            throw new Error(response.error || 'Token refresh failed');
        }
    });
}

// ============================================================================
// Hook
// ============================================================================

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

// ============================================================================
// Provider Component
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<StoredUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Restore session from the HttpOnly cookie (and keep a local user profile cache).
    useEffect(() => {
        let cancelled = false;

        const restore = async () => {
            configureApiClient();
            const cached = tokenStorage.getUser();
            if (cached && !cancelled) {
                setUser(cached);
            }

            try {
                const response = await authApi.session();
                if (cancelled) return;
                if (response.success && response.data?.user) {
                    tokenStorage.setUser(response.data.user);
                    setUser(response.data.user);
                } else {
                    tokenStorage.clear();
                    setUser(null);
                }
            } catch {
                if (!cancelled) {
                    // Keep cached user for soft offline; a later 401 will refresh or logout.
                    if (!cached) setUser(null);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void restore();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.login({ email, password });
            if (!response.success) {
                const err = new Error(response.error || 'Login failed');
                (err as any).status = (response as any).status ?? 0;
                (err as any).retryAfterSeconds = (response as any).retryAfterSeconds;
                throw err;
            }
            tokenStorage.setUser(response.data.user);
            configureApiClient();
            setUser(response.data.user);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoggingOut(true);
        setUser(null);

        authApi.logout().catch(() => {
            // Cookies / server revocation may already be cleared
        });

        tokenStorage.clear();
        window.location.href = '/login';
        setIsLoggingOut(false);
    }, []);

    const refreshToken = useCallback(async () => {
        const response = await authApi.refreshToken();
        if (!response.success) {
            await logout();
            throw new Error(response.error || 'Token refresh failed');
        }
    }, [logout]);

    const isAuthenticated = useMemo(() => {
        if (isLoggingOut) return false;
        return !!user;
    }, [user, isLoggingOut]);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated,
            isLoading,
            isLoggingOut,
            login,
            logout,
            refreshToken,
        }),
        [user, isAuthenticated, isLoading, isLoggingOut, login, logout, refreshToken]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
