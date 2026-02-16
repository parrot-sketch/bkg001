'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { tokenStorage, type StoredUser } from '@/lib/auth/token';
import { apiClient } from '@/lib/api/client';
import { Role } from '@/domain/enums/Role';

// -- Types --

interface AuthContextType {
    user: StoredUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (dto: {
        id: string;
        email: string;
        password: string;
        role: Role;
        firstName?: string;
        lastName?: string;
        phone?: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

// -- Helper: Configure API Client --

function configureApiClient(): void {
    // Set token provider
    apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());

    // Set refresh token provider
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

// -- Context Creation --

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

// -- Provider Component --

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<StoredUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Initialize auth state from storage on mount
    useEffect(() => {
        const initializeAuth = () => {
            const storedUser = tokenStorage.getUser();
            const accessToken = tokenStorage.getAccessToken();

            if (storedUser && accessToken) {
                setUser(storedUser);
                configureApiClient();
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.login({ email, password });

            if (!response.success) {
                throw new Error(response.error || 'Login failed');
            }

            // Store tokens and user data
            tokenStorage.setAccessToken(response.data.accessToken);
            tokenStorage.setRefreshToken(response.data.refreshToken);
            tokenStorage.setUser(response.data.user);

            // Configure API client
            configureApiClient();

            // Update state
            setUser(response.data.user);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(
        async (dto: {
            id: string;
            email: string;
            password: string;
            role: Role;
            firstName?: string;
            lastName?: string;
            phone?: string;
        }) => {
            setIsLoading(true);
            try {
                const response = await authApi.register(dto);

                if (!response.success) {
                    throw new Error(response.error || 'Registration failed');
                }
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fire server-side revocation in background
            if (tokenStorage.isAuthenticated()) {
                await authApi.logout().catch((err) =>
                    console.error('[AUTH] Background token revocation failed:', err)
                );
            }

            // 2. Clear client state
            tokenStorage.clear();
            setUser(null);
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const refreshToken = useCallback(async () => {
        try {
            const refreshTokenValue = tokenStorage.getRefreshToken();

            if (!refreshTokenValue) {
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
        } catch (error) {
            // if refresh fails, ensure we convert it to an error
            throw error;
        }
    }, [logout]);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: !!user && tokenStorage.isAuthenticated(),
            isLoading,
            login,
            register,
            logout,
            refreshToken,
        }),
        [user, isLoading, login, register, logout, refreshToken]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
