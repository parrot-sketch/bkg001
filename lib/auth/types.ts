/**
 * Authentication and API types
 */

/**
 * Authenticated request context
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

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
 * Controller request interface (for internal use)
 * @deprecated - Use NextRequest directly in API routes
 */
export interface ControllerRequest {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: AuthContext;
}

/**
 * Controller response interface (for internal use)
 * @deprecated - Use NextResponse directly in API routes
 */
export interface ControllerResponse {
  status: number;
  body: ApiResponse<unknown>;
}
