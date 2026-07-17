/**
 * Authentication Hook
 * 
 * React hook for accessing authentication state and operations.
 * Now consumes the global AuthContext to prevent state flicker.
 */

import { useAuthContext, type AuthUser } from '../../contexts/AuthContext';
import { Role } from '../../domain/enums/Role';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
