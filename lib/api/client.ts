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
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

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
            ...this.getAuthHeader(),
            ...options.headers,
          },
        });

        const retryData = await retryResponse.json();

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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
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
