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
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Base API client class
 */
class ApiClient {
  private baseUrl: string;
  private getAuthToken: (() => string | null) | null = null;
  private refreshTokenFn: (() => Promise<void>) | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
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
  private async request<T>(
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
          };
        } catch {
          // Fallback to original response
          const text = await response.text();
          return {
            success: false,
            error: `Unexpected response format: ${response.status} ${response.statusText}`,
          };
        }
      }

      // Handle 401 Unauthorized - try to refresh token and retry
      if (response.status === 401 && this.refreshTokenFn && !endpoint.includes('/auth/refresh')) {
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
            error: data.error || 'Authentication failed',
            message: data.message,
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
              };
            }
          }
        } else {
          try {
            const text = await clonedRetryResponse.text();
            return {
              success: false,
              error: `Unexpected response format: ${retryResponse.status} ${retryResponse.statusText}`,
            };
          } catch {
            const text = await retryResponse.text();
            return {
              success: false,
              error: `Unexpected response format: ${retryResponse.status} ${retryResponse.statusText}`,
            };
          }
        }

        if (!retryResponse.ok) {
          return {
            success: false,
            error: retryData.error || `Request failed with status ${retryResponse.status}`,
            message: retryData.message,
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

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`,
          message: data.message,
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
