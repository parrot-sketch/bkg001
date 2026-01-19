/**
 * Types for controllers and middleware
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Authenticated request context
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

/**
 * Controller request interface (can be extended for specific frameworks)
 */
export interface ControllerRequest {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: AuthContext;
}

/**
 * Controller response interface
 */
export interface ControllerResponse {
  status: number;
  body: ApiResponse<unknown>;
}
