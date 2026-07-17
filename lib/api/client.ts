/**
 * API Client
 *
 * Cookie-only HTTP client for the same-origin BFF API.
 *
 * Authentication model:
 * - No JWT is ever read by JavaScript. The `accessToken` and `refreshToken`
 *   live in httpOnly, Secure, SameSite cookies set by the server. The browser
 *   attaches them automatically on every same-origin request (credentials:
 *   'same-origin'), so the client never builds an Authorization header.
 * - On a 401, the client performs a single-flight refresh (one attempt) by
 *   calling the refresh provider, which hits /api/authentication/refresh using
 *   the refresh cookie. The refresh call is performed OUTSIDE this request path
 *   (raw fetch) so it can never recurse. A retried request is marked and will
 *   not trigger another refresh.
 */

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  status?: number;
  retryAfterSeconds?: number;
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
    [key: string]: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Base API client class
 */
class ApiClient {
  private baseUrl: string;
  private refreshTokenFn: (() => Promise<void>) | null = null;
  // Single-flight lock so concurrent 401s trigger exactly one refresh.
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Set the refresh provider. The provider must perform the refresh HTTP call
   * itself (raw fetch) and must NOT route back through this client's request()
   * method, so a failed refresh can never recurse.
   */
  setRefreshTokenProvider(refreshToken: () => Promise<void>) {
    this.refreshTokenFn = refreshToken;
  }

  /**
   * Execute a fetch and normalize the response into { status, data, retryAfterSeconds }.
   * Clones the response before reading to avoid stream-consumption issues; uses
   * cache: 'no-store' to prevent "Connection closed" style caching problems.
   */
  private async performFetch(
    url: string,
    options: RequestInit,
  ): Promise<{ status: number; data: any; retryAfterSeconds?: number }> {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
    });

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const safeRetryAfterSeconds =
      typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds
        : undefined;

    const contentType = response.headers.get('content-type');
    const clonedResponse = response.clone();

    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await clonedResponse.json();
        return { status: response.status, data, retryAfterSeconds: safeRetryAfterSeconds };
      } catch {
        try {
          const data = await response.json();
          return { status: response.status, data, retryAfterSeconds: safeRetryAfterSeconds };
        } catch {
          return { status: response.status, data: null, retryAfterSeconds: safeRetryAfterSeconds };
        }
      }
    }

    // Non-JSON response (e.g. an HTML error page).
    try {
      await clonedResponse.text();
    } catch {
      try {
        await response.text();
      } catch {
        /* ignore */
      }
    }
    return { status: response.status, data: null, retryAfterSeconds: safeRetryAfterSeconds };
  }

  /**
   * Map a performed fetch result into the standard ApiResponse shape.
   */
  private normalize(result: {
    status: number;
    data: any;
    retryAfterSeconds?: number;
  }): ApiResponse<unknown> {
    const { status, data, retryAfterSeconds } = result;

    if (data && typeof data === 'object' && (data as any).success === false) {
      return { ...(data as ApiError), status, retryAfterSeconds };
    }
    if (data && typeof data === 'object' && (data as any).success === true) {
      return data as ApiSuccess<unknown>;
    }
    if (status >= 200 && status < 300) {
      return { success: true, data: data as unknown };
    }
    return {
      success: false,
      error: (data as any)?.error || `Request failed with status ${status}`,
      message: (data as any)?.message,
      status,
      retryAfterSeconds,
    };
  }

  /**
   * Make an HTTP request.
   *
   * @param _isRetry internal — when true, a 401 will NOT trigger another refresh
   *        (prevents recursive refreshes).
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry = false,
  ): Promise<ApiResponse<T>> {
    // Cache-busting for GET requests to prevent stale cached responses.
    let url = `${this.baseUrl}${endpoint}`;
    if ((options.method || 'GET') === 'GET') {
      url += (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      ...options.headers,
    };

    try {
      const result = await this.performFetch(url, { ...options, headers });

      // On 401, attempt exactly one refresh + retry. The refresh provider uses a
      // raw fetch, so it cannot re-enter this handler; _isRetry guards the retry.
      if (result.status === 401 && !_isRetry && this.refreshTokenFn) {
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshTokenFn().finally(() => {
            this.refreshPromise = null;
          });
        }
        try {
          await this.refreshPromise;
        } catch {
          return this.normalize({ ...result, data: result.data ?? {} });
        }
        return this.request<T>(endpoint, options, true);
      }

      return this.normalize(result) as ApiResponse<T>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      if (
        errorMessage.includes('Connection closed') ||
        errorMessage.includes('connection closed') ||
        errorMessage.includes('Failed to fetch')
      ) {
        return {
          success: false,
          error: 'Network error: Please refresh the page and try again',
        };
      }
      return { success: false, error: errorMessage };
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

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
