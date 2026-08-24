/**
 * API Client
 * 
 * HTTP client for communicating with the backend API.
 * Handles authentication, request/response transformation, and error handling.
 */

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  /**
   * HTTP status code from the underlying fetch response.
   * Added so UI layers can map errors (e.g. 429) to the correct message.
   */
  status?: number;
  /**
   * Derived from `Retry-After` response header when present.
   * Useful for rate-limit / lockout UX.
   */
  retryAfterSeconds?: number;
  /**
   * Many endpoints return additional structured error metadata (e.g. `missingItems`,
   * `details`, `code`, `metadata`). Preserve these fields so UIs can present
   * actionable error messages instead of a generic failure.
   */
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    [key: string]: number; // Allow additional numeric stats (e.g. newToday, newThisMonth)
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Base API client class
 */
export class ApiClient {
  private baseUrl: string;
  private getAuthToken: (() => string | null) | null = null;
  private refreshTokenFn: (() => Promise<void>) | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (typeof window !== 'undefined') {
      console.debug('[ApiClient] baseUrl:', this.baseUrl);
    }
  }

  /**
   * Set the function to retrieve the authentication token
   */
  setAuthTokenProvider(getToken: () => string | null) {
    this.getAuthToken = getToken;
  }

  /**
   * Set the function to refresh the authentication token
   */
   setRefreshTokenProvider(refreshToken: () => Promise<void>) {
    this.refreshTokenFn = refreshToken;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Get the authorization header
   */
  private getAuthHeader(): Record<string, string> {
    const token = this.getAuthToken?.();
    if (!token) {
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Make an HTTP request
   * 
   * CRITICAL FIX: Prevents "Connection closed" errors in production by:
   * 1. Using cache: 'no-store' to prevent browser/edge caching
   * 2. Cloning response before reading to avoid stream consumption issues
   * 3. Adding cache-busting for GET requests
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    // Add cache-busting for GET requests to prevent stale cached responses
    let url = `${this.baseUrl}${endpoint}`;
    if ((options.method || 'GET') === 'GET' && !url.includes('?')) {
      url = `${url}?_t=${Date.now()}`;
    } else if ((options.method || 'GET') === 'GET' && url.includes('?')) {
      url = `${url}&_t=${Date.now()}`;
    }

    if (url.startsWith('/api/api/')) {
      console.warn('[ApiClient] Double /api detected, normalizing:', url);
      url = url.replace(/^\/api\/api\//, '/api/');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // CRITICAL: Prevent any caching that could cause "Connection closed" errors
        cache: 'no-store',
        credentials: 'same-origin',
      });

      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      const safeRetryAfterSeconds =
        typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds
          : undefined;

      // CRITICAL: Clone response before reading to avoid stream consumption issues
      // This is essential for production where responses might be cached
      const clonedResponse = response.clone();

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        try {
          // Use cloned response to avoid "Connection closed" errors
          data = await clonedResponse.json();
        } catch (jsonError) {
          // If JSON parsing fails on cloned response, try original as fallback
          try {
            data = await response.json();
          } catch (fallbackError) {
            // If both fail, return error
            return {
              success: false,
              error: `Invalid JSON response: ${response.status} ${response.statusText}`,
              status: response.status,
              retryAfterSeconds: safeRetryAfterSeconds,
            };
          }
        }
      } else {
        // Non-JSON response (e.g., 404 HTML page)
        try {
          const text = await clonedResponse.text();
          return {
            success: false,
            error: `Unexpected response format: ${response.status} ${response.statusText}`,
            status: response.status,
            retryAfterSeconds: safeRetryAfterSeconds,
          };
        } catch {
          // Fallback to original response
          const text = await response.text();
          return {
            success: false,
            error: `Unexpected response format: ${response.status} ${response.statusText}`,
            status: response.status,
            retryAfterSeconds: safeRetryAfterSeconds,
          };
        }
      }

      // Handle 401 Unauthorized - try to refresh token and retry
      // Exclude auth endpoints that manage tokens themselves:
      // - /authentication/login: we are trying to obtain tokens, not refresh them
      // - /authentication/refresh: avoid infinite refresh loops
      if (
        response.status === 401 &&
        this.refreshTokenFn &&
        !endpoint.includes('/authentication/login') &&
        !endpoint.includes('/auth/refresh')
      ) {
        // Check if token refresh is already in progress
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          this.refreshPromise = this.refreshTokenFn().catch((error) => {
            // If refresh fails, reset state
            this.isRefreshing = false;
            this.refreshPromise = null;
            throw error;
          });
        }

        // Wait for token refresh to complete
        try {
          await this.refreshPromise;
        } catch (error) {
          // Refresh failed - return original error
          return {
            success: false,
            error: data?.error || 'Authentication failed',
            message: data?.message,
            status: response.status,
            retryAfterSeconds: safeRetryAfterSeconds,
          };
        } finally {
          this.isRefreshing = false;
          this.refreshPromise = null;
        }

        // Retry the original request with new token
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            ...this.getAuthHeader(),
            ...options.headers,
          },
          cache: 'no-store',
          credentials: 'same-origin',
        });

        const retryAfterRetryHeader = retryResponse.headers.get('Retry-After');
        const retryAfterRetrySeconds = retryAfterRetryHeader ? Number(retryAfterRetryHeader) : undefined;
        const safeRetryAfterRetrySeconds =
          typeof retryAfterRetrySeconds === 'number' && Number.isFinite(retryAfterRetrySeconds)
            ? retryAfterRetrySeconds
            : undefined;

        // Clone retry response before reading
        const clonedRetryResponse = retryResponse.clone();

        // Check if retry response is JSON before parsing
        const retryContentType = retryResponse.headers.get('content-type');
        let retryData: any;

        if (retryContentType && retryContentType.includes('application/json')) {
          try {
            // Use cloned response to avoid "Connection closed" errors
            retryData = await clonedRetryResponse.json();
          } catch (jsonError) {
            // Fallback to original response
            try {
              retryData = await retryResponse.json();
            } catch (fallbackError) {
              return {
                success: false,
                error: `Invalid JSON response: ${retryResponse.status} ${retryResponse.statusText}`,
                status: retryResponse.status,
                retryAfterSeconds: safeRetryAfterRetrySeconds,
              };
            }
          }
        } else {
          try {
            const text = await clonedRetryResponse.text();
            return {
              success: false,
              error: `Unexpected response format: ${retryResponse.status} ${retryResponse.statusText}`,
              status: retryResponse.status,
              retryAfterSeconds: safeRetryAfterRetrySeconds,
            };
          } catch {
            const text = await retryResponse.text();
            return {
              success: false,
              error: `Unexpected response format: ${retryResponse.status} ${retryResponse.statusText}`,
              status: retryResponse.status,
              retryAfterSeconds: safeRetryAfterRetrySeconds,
            };
          }
        }

        if (!retryResponse.ok) {
          // Preserve structured error payloads when present.
          if (retryData && typeof retryData === 'object' && (retryData as any).success === false) {
            return {
              ...(retryData as ApiError),
              status: retryResponse.status,
              retryAfterSeconds: safeRetryAfterRetrySeconds,
            };
          }
          return {
            success: false,
            error: retryData?.error || `Request failed with status ${retryResponse.status}`,
            message: retryData?.message,
            status: retryResponse.status,
            retryAfterSeconds: safeRetryAfterRetrySeconds,
          };
        }

        // Handle retry response
        if (retryData.success === false) {
          return retryData as ApiError;
        }

        if (retryData.success === true) {
          return retryData as ApiSuccess<T>;
        }

        return {
          success: true,
          data: retryData as T,
        };
      }

      // Preserve structured API error payloads even when status is non-2xx.
      if (data && typeof data === 'object' && (data as any).success === false) {
        return {
          ...(data as ApiError),
          status: response.status,
          retryAfterSeconds: safeRetryAfterSeconds,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: (data as any)?.error || `Request failed with status ${response.status}`,
          message: (data as any)?.message,
          status: response.status,
          retryAfterSeconds: safeRetryAfterSeconds,
        };
      }

      // Handle both ApiResponse format and direct data
      if (data.success === false) {
        return data as ApiError;
      }

      if (data.success === true) {
        return data as ApiSuccess<T>;
      }

      // If response doesn't follow ApiResponse format, wrap it
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      // Handle "Connection closed" errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';

      // Check if it's a connection closed error
      if (errorMessage.includes('Connection closed') ||
        errorMessage.includes('connection closed') ||
        errorMessage.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Network error: Please refresh the page and try again',
        };
      }

      // Handle URL parse errors (e.g. relative base URL in non-browser environments)
      if (errorMessage.includes('Failed to parse URL') || errorMessage.includes('Invalid URL') || error instanceof TypeError) {
        return {
          success: false,
          error: `API configuration error: ${errorMessage}`,
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Initialize token provider from tokenStorage
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('../auth/token').then(({ tokenStorage }) => {
    apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
  });
}
