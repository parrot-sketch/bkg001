'use client';

/**
 * Patient Login Page
 * 
 * Enterprise-grade authentication page with security-focused design.
 * 
 * Security Features:
 * - Generic error messages (no user enumeration)
 * - Network vs auth error differentiation
 * - No credential leakage in errors
 * - Proper session handling
 * 
 * UX Features:
 * - Clear input labels (not placeholders only)
 * - Strong focus states and keyboard navigation
 * - Loading states preventing double submits
 * - Password visibility toggle
 * - Caps lock detection
 * - No layout shifts during async states
 * - High contrast for accessibility (WCAG-friendly)
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getPostAuthRedirect } from '@/lib/utils/patient';

// Generic error message - prevents user enumeration
const GENERIC_ERROR_MESSAGE = 'Invalid email or password. Please try again.';
const NETWORK_ERROR_MESSAGE = 'Connection error. Please check your internet connection and try again.';

// Check if error is network-related
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('failed to fetch')
    );
  }
  return false;
};

export default function PatientLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = isSubmitting || isLoading;

  // Client-side validation (does not expose information)
  const validateForm = (): boolean => {
    setFormError(null);
    setNetworkError(false);

    if (!email.trim()) {
      setFormError('Email is required');
      emailInputRef.current?.focus();
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address');
      emailInputRef.current?.focus();
      return false;
    }

    if (!password) {
      setFormError('Password is required');
      passwordInputRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isDisabled) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNetworkError(false);

    try {
      await login(email.trim(), password);
      
      // Success - intelligent redirect based on PatientProfile
      // If user has PatientProfile → /patient/dashboard (clinical)
      // If user doesn't have PatientProfile → /portal/welcome (onboarding)
      // Get user ID from stored auth state after login
      const { tokenStorage } = await import('@/lib/auth/token');
      const storedUser = tokenStorage.getUser();
      const userId = storedUser?.id || email.trim(); // Fallback to email if user not found
      const redirectPath = await getPostAuthRedirect(userId);
      router.push(redirectPath);
    } catch (error) {
      // Determine if it's a network error vs auth error
      const isNetwork = isNetworkError(error);
      setNetworkError(isNetwork);

      // Generic error message - prevents user enumeration
      // Never reveal whether email exists or password is wrong
      const errorMessage = isNetwork ? NETWORK_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
      
      setFormError(errorMessage);
      
      // Focus back on password field for security
      // (Don't focus on email to avoid revealing which field was wrong)
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors on input change
    if (formError) {
      setFormError(null);
      setNetworkError(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear errors on input change
    if (formError) {
      setFormError(null);
      setNetworkError(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Fixed height to prevent layout shifts */}
      <div className="text-center space-y-2" style={{ minHeight: '80px' }}>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Sign In
        </h1>
        <p className="text-sm text-gray-600">
          Access your patient portal
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-900">
            Email Address
          </Label>
          <Input
            ref={emailInputRef}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={handleEmailChange}
            required
            disabled={isDisabled}
            className={cn(
              'h-11 bg-transparent border-gray-300',
              'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
              'transition-colors',
              formError && !networkError && 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            )}
            aria-invalid={!!formError}
            aria-describedby={formError ? 'form-error' : undefined}
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-900">
              Password
            </Label>
            <Link
              href="/patient/forgot-password"
              className="text-xs text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            ref={passwordInputRef}
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            required
            disabled={isDisabled}
            showCapsLockWarning={true}
            className={cn(
              'h-11 bg-transparent border-gray-300',
              'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
              'transition-colors',
              formError && !networkError && 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            )}
            aria-invalid={!!formError}
            aria-describedby={formError ? 'form-error' : undefined}
          />
        </div>

        {/* Error Message - Fixed height to prevent layout shifts */}
        {formError && (
          <div
            id="form-error"
            className="rounded-md border p-3 min-h-[52px] flex items-start gap-2"
            role="alert"
            aria-live="polite"
            style={{
              backgroundColor: networkError ? '#FEF3C7' : '#FEE2E2',
              borderColor: networkError ? '#FCD34D' : '#FCA5A5',
            }}
          >
            <div className={cn(
              'mt-0.5 h-4 w-4 flex-shrink-0',
              networkError ? 'text-amber-600' : 'text-red-600'
            )}>
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <p className={cn(
              'text-sm font-medium',
              networkError ? 'text-amber-800' : 'text-red-800'
            )}>
              {formError}
            </p>
          </div>
        )}

        {/* Submit Button - Fixed height to prevent layout shifts */}
        <Button
          type="submit"
          className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          disabled={isDisabled}
          aria-busy={isSubmitting}
        >
          <span className="flex items-center justify-center gap-2">
            {isSubmitting && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            )}
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
          </span>
        </Button>
      </form>

      {/* Register Link - Fixed height to prevent layout shifts */}
      <div className="text-center pt-4 border-t border-gray-200" style={{ minHeight: '60px' }}>
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/patient/register"
            className="font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* Footer Link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}