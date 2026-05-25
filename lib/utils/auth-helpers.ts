/**
 * Authentication Helpers and Utilities
 * 
 * Pure functions and static messages for login validation,
 * error classification, and security guards.
 */

export const MSG = {
  AUTH_ERROR: 'Invalid email or password. Please try again.',
  NETWORK_ERROR: 'Connection error or system is temporarily busy. Please check your internet connection and try again.',
  RATE_LIMITED: 'Too many sign-in attempts from your network. Please wait a few minutes and try again, or contact support.',
  ACCOUNT_LOCKED: 'Your account is temporarily locked due to multiple failed attempts. Please try again later or contact support.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact your administrator.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_REQUIRED: 'Email address is required.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_REQUIRED: 'Password is required.',
} as const;

export type MsgKey = keyof typeof MSG;

/**
 * Checks if a string message represents a network/fetch connection error
 */
export const isNetworkError = (msg: string): boolean =>
  /network|fetch|connection|timeout|failed to fetch/i.test(msg);

/**
 * Classifies HTTP status codes and error messages into distinct system message keys
 */
export const classify = (status: number, msg: string): MsgKey => {
  if (status === 429) return 'RATE_LIMITED';
  if (status === 423) return 'ACCOUNT_LOCKED';
  if (status === 403) return 'ACCOUNT_INACTIVE';
  if (status >= 500 || isNetworkError(msg)) return 'NETWORK_ERROR';
  return 'AUTH_ERROR';
};

/**
 * Open Redirect Guard: Validates that a redirect path is safe and relative
 * to prevent attackers from injecting malicious external URLs.
 */
export const getSafeRedirectUrl = (url: string, fallback: string = '/'): string => {
  if (!url) return fallback;
  const cleanUrl = url.trim();
  // Prevent protocol-relative redirects (e.g., //example.com) and absolute URLs
  if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('//')) {
    return cleanUrl;
  }
  return fallback;
};

interface LoginFormErrors {
  email?: string;
  password?: string;
}

/**
 * Validates login input fields (pure validation logic)
 */
export const validateLoginForm = (email: string, password?: string): LoginFormErrors => {
  const errs: LoginFormErrors = {};
  
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errs.email = MSG.EMAIL_REQUIRED;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errs.email = MSG.EMAIL_INVALID;
  }
  
  if (password !== undefined && !password) {
    errs.password = MSG.PASSWORD_REQUIRED;
  }
  
  return errs;
};
