/**
 * Authentication Hook
 * 
 * React hook for accessing authentication state and operations.
 * Now consumes the global AuthContext to prevent state flicker.
 */

import { useAuthContext } from '../../contexts/AuthContext';
import { type StoredUser } from '../../lib/auth/token';
import { Role } from '../../domain/enums/Role';

interface UseAuthReturn {
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

/**
 * Custom hook for authentication
 * Delegates to AuthContext
 */
export function useAuth(): UseAuthReturn {
  return useAuthContext();
}
