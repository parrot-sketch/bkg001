'use client';

/**
 * Unified Login Page
 * 
 * Enterprise-grade authentication page with security-focused design.
 * Mobile-optimized with splash screen for app-like experience.
 * 
 * Security Features:
 * - Generic error messages (no user enumeration)
 * - Network vs auth error differentiation
 * - No credential leakage in errors
 * - Proper session handling
 * 
 * UX Features:
 * - Mobile splash screen with logo
 * - Clear input labels (not placeholders only)
 * - Strong focus states and keyboard navigation
 * - Loading states preventing double submits
 * - Password visibility toggle
 * - Caps lock detection
 * - No layout shifts during async states
 * - High contrast for accessibility (WCAG-friendly)
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getPostAuthRedirect } from '@/lib/utils/auth-redirect';

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
  const [showSplash, setShowSplash] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = isSubmitting || isLoading;

  // Detect mobile and handle splash screen
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        // Show splash for 1 second on mobile (reduced from 1.5s for better UX)
        const timer = setTimeout(() => {
          setShowSplash(false);
          // Ensure inputs are focusable after splash screen disappears
          // Use requestAnimationFrame to ensure DOM is fully updated
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Don't auto-focus - let user tap to focus naturally
              // Auto-focus can interfere with mobile touch interactions
              if (emailInputRef.current) {
                emailInputRef.current.focus();
                emailInputRef.current.blur();
              }
            });
          });
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setShowSplash(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      
      // Success - intelligent redirect based on user role
      // Get user ID and role from stored auth state after login
      const { tokenStorage } = await import('@/lib/auth/token');
      const storedUser = tokenStorage.getUser();
      const userId = storedUser?.id || email.trim(); // Fallback to email if user not found
      const userRole = storedUser?.role; // Get role from auth token
      const redirectPath = await getPostAuthRedirect(userId, userRole);
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

  // Mobile Splash Screen
  if (showSplash && isMobile) {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-brand-primary via-brand-dusk to-brand-primary flex items-center justify-center z-50"
        style={{ 
          pointerEvents: 'auto',
          touchAction: 'none', // Prevent touch interactions during splash
        }}
      >
        <div className="flex flex-col items-center space-y-6 animate-fade-in">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <div className="absolute inset-0 bg-white rounded-2xl p-4 shadow-2xl flex items-center justify-center">
              <Image
                src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                alt="Nairobi Sculpt Logo"
                width={120}
                height={120}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-white font-playfair-display">Nairobi Sculpt</h2>
            <p className="text-sm text-white/80">Aesthetic Centre</p>
          </div>
          <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full animate-loading-bar" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header - Fixed height to prevent layout shifts */}
      <div className="text-center space-y-2" style={{ minHeight: '80px' }}>
        {/* Logo for mobile */}
        {isMobile && (
          <div className="mb-4 flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-white rounded-xl p-3 shadow-lg flex items-center justify-center">
                <Image
                  src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                  alt="Nairobi Sculpt Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        )}
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Sign In
        </h1>
        <p className="text-sm text-gray-600">
          Access your account
        </p>
      </div>

      {/* Login Form */}
      <form 
        onSubmit={handleSubmit} 
        className="space-y-6" 
        noValidate
        style={{ 
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
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
              'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
              'transition-colors',
              'touch-manipulation select-text',
              '[-webkit-tap-highlight-color:transparent]',
              formError && !networkError && 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            )}
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
            aria-invalid={!!formError}
            aria-describedby={formError ? 'form-error' : undefined}
            onFocus={(e) => {
              // Ensure input is properly focused on mobile
              e.target.setAttribute('data-focused', 'true');
            }}
            onBlur={(e) => {
              e.target.removeAttribute('data-focused');
            }}
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
              className="text-xs text-brand-primary hover:text-brand-primary/80 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 rounded"
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
              'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
              'transition-colors',
              'touch-manipulation select-text',
              '[-webkit-tap-highlight-color:transparent]',
              formError && !networkError && 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            )}
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
            aria-invalid={!!formError}
            aria-describedby={formError ? 'form-error' : undefined}
            onFocus={(e) => {
              // Ensure input is properly focused on mobile
              e.target.setAttribute('data-focused', 'true');
            }}
            onBlur={(e) => {
              e.target.removeAttribute('data-focused');
            }}
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
          className="w-full h-11 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
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
            className="font-medium text-brand-primary hover:text-brand-primary/80 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 rounded"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* Footer Link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 rounded"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}