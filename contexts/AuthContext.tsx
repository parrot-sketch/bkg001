'use client';

/**
 * AuthContext - Authentication State Management
 * 
 * Clean implementation with proper logout handling to prevent flicker.
 * Single responsibility: manages auth state only.
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
    apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
    apiClient.setRefreshTokenProvider(async () => {
        const refreshTokenValue = tokenStorage.getRefreshToken();
        if (!refreshTokenValue) {
            throw new Error('No refresh token available');
        }
        const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });
        if (!response.success) {
            throw new Error(response.error || 'Token refresh failed');
        }
        tokenStorage.setAccessToken(response.data.accessToken);
        tokenStorage.setRefreshToken(response.data.refreshToken);
        apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
    });
}

function initializeAuthFromStorage(): { user: StoredUser | null; isAuthenticated: boolean } {
    const storedUser = tokenStorage.getUser();
    const accessToken = tokenStorage.getAccessToken();
    const isAuthenticated = !!(storedUser && accessToken);
    
    if (isAuthenticated) {
        configureApiClient();
    }
    
    return { user: storedUser, isAuthenticated };
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

    // Initialize auth state on mount
    useEffect(() => {
        const { user: storedUser } = initializeAuthFromStorage();
        setUser(storedUser);
        setIsLoading(false);
    }, []);

    // Login function
    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.login({ email, password });
            if (!response.success) {
                throw new Error(response.error || 'Login failed');
            }
            tokenStorage.setAccessToken(response.data.accessToken);
            tokenStorage.setRefreshToken(response.data.refreshToken);
            tokenStorage.setUser(response.data.user);
            configureApiClient();
            setUser(response.data.user);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout function - Fixed to prevent flicker
    const logout = useCallback(async () => {
        // 1. IMMEDIATELY clear state to prevent flash
        setIsLoggingOut(true);
        setUser(null);
        
        // 2. Clear token storage synchronously
        const hadToken = tokenStorage.isAuthenticated();
        tokenStorage.clear();
        
        // 3. Fire server-side revocation (fire and forget - don't await)
        if (hadToken) {
            authApi.logout().catch(() => {
                // Silently fail - token is already cleared locally
            });
        }
        
        // 4. Navigate immediately using window.location to bypass React render cycle
        // This prevents the brief flash of unauthenticated UI before redirect
        window.location.href = '/login';
        
        // 5. Reset state after navigation
        setIsLoggingOut(false);
    }, []);

    // Refresh token function
    const refreshToken = useCallback(async () => {
        const refreshTokenValue = tokenStorage.getRefreshToken();
        if (!refreshTokenValue) {
            await logout();
            throw new Error('No refresh token available');
        }

        const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });
        if (!response.success) {
            await logout();
            throw new Error(response.error || 'Token refresh failed');
        }

        tokenStorage.setAccessToken(response.data.accessToken);
        tokenStorage.setRefreshToken(response.data.refreshToken);
        apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
    }, [logout]);

    // Computed values
    const isAuthenticated = useMemo(() => {
        // During logout, always return false
        if (isLoggingOut) return false;
        // Otherwise check user and token
        return !!user && tokenStorage.isAuthenticated();
    }, [user, isLoggingOut]);

    // Context value
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
