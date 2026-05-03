'use client';

/**
 * Login Page — Nairobi Sculpt
 *
 * Enterprise-grade, WCAG AA compliant authentication page.
 *
 * Design spec compliance:
 * - Mobile-first, no horizontal scroll
 * - Inputs: 48px height, full-width on mobile
 * - Buttons: 48px height
 * - Field spacing: 20px
 * - Font: Inter (loaded globally)
 * - Color: brand.primary #1E3A5F, brand.secondary #bea032
 * - Focus rings visible, keyboard navigable
 * - Error messages screen-reader friendly (role="alert")
 * - No user enumeration — generic errors only
 * - Prevents double submit via isSubmitting guard
 * - Preserves email after failed login
 * - Show/hide password toggle
 * - Caps lock warning
 * - Loading spinner on submit button
 * - Session-expired banner support
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { getPostAuthRedirect } from '@/lib/utils/auth-redirect';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const MSG = {
  AUTH_ERROR: 'Invalid email or password. Please try again.',
  NETWORK_ERROR: 'Connection error. Please check your internet connection and try again.',
  RATE_LIMITED: 'Too many sign-in attempts. Your account has been temporarily locked. Please try again in 15 minutes or contact support.',
  ACCOUNT_LOCKED: 'Your account is temporarily locked due to multiple failed attempts. Please try again later or contact support.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact your administrator.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_REQUIRED: 'Email address is required.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_REQUIRED: 'Password is required.',
} as const;

const isNetworkError = (msg: string) =>
  /network|fetch|connection|timeout|failed to fetch/i.test(msg);

const classify = (status: number, msg: string): keyof typeof MSG => {
  if (status === 429) return 'RATE_LIMITED';
  if (status === 423) return 'ACCOUNT_LOCKED';
  if (status === 403) return 'ACCOUNT_INACTIVE';
  if (isNetworkError(msg)) return 'NETWORK_ERROR';
  return 'AUTH_ERROR';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-10 h-10 text-brand-primary"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('w-4 h-4 shrink-0 mt-0.5', className)} aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('w-4 h-4 shrink-0 mt-0.5', className)} aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ key: keyof typeof MSG; isWarning?: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const isDisabled = isSubmitting || isLoading;
  const sessionExpired = searchParams.get('reason') === 'expired';

  // Auto-focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Scroll error into view on mobile
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    if (!email.trim()) {
      errs.email = MSG.EMAIL_REQUIRED;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = MSG.EMAIL_INVALID;
    }
    if (!password) {
      errs.password = MSG.PASSWORD_REQUIRED;
    }
    setFieldErrors(errs);
    if (errs.email) emailRef.current?.focus();
    else if (errs.password) passwordRef.current?.focus();
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      const { tokenStorage } = await import('@/lib/auth/token');
      const stored = tokenStorage.getUser();
      const redirect = await getPostAuthRedirect(stored?.id ?? email.trim(), stored?.role);
      router.push(redirect);
    } catch (err: unknown) {
      const status = (err as any)?.status ?? (err as any)?.response?.status ?? 0;
      const message = err instanceof Error ? err.message : String(err);
      const key = classify(status, message);
      setError({ key, isWarning: key === 'NETWORK_ERROR' || key === 'RATE_LIMITED' || key === 'ACCOUNT_LOCKED' });
      // Focus password for auth errors; email for account issues
      if (key === 'AUTH_ERROR' || key === 'NETWORK_ERROR') {
        passwordRef.current?.focus();
        passwordRef.current?.select();
      } else {
        emailRef.current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Field change helpers ────────────────────────────────────────────────────
  const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined }));
    if (error) setError(null);
  };

  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined }));
    if (error) setError(null);
  };

  // ── Shared input classes ────────────────────────────────────────────────────
  const inputBase =
    'block w-full rounded-lg border bg-white px-4 text-[15px] text-slate-900 placeholder-slate-400 ' +
    'outline-none transition-all duration-150 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-0 focus-visible:border-brand-primary ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'h-12'; // 48px — meets 44px minimum

  const inputNormal = 'border-slate-300 hover:border-slate-400';
  const inputError  = 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-500 bg-red-50';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Icon + Heading ─────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/8 ring-1 ring-brand-primary/15">
            <LockIcon />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your credentials to access the clinical system
          </p>
        </div>
      </div>

      {/* ── Session-expired banner ────────────────────────────────────────── */}
      {sessionExpired && !error && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <InfoIcon className="text-amber-500" />
          <span>{MSG.SESSION_EXPIRED}</span>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
        aria-label="Sign in form"
      >
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email address
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={onEmailChange}
            disabled={isDisabled}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={cn(inputBase, fieldErrors.email ? inputError : inputNormal)}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertIcon className="text-red-500 w-3.5 h-3.5 mt-0" />
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              href="/patient/forgot-password"
              className={cn(
                'text-xs font-medium text-brand-primary underline-offset-2',
                'hover:underline focus-visible:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded-sm',
                'transition-colors',
              )}
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            ref={passwordRef}
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={onPasswordChange}
            disabled={isDisabled}
            required
            showCapsLockWarning
            aria-required="true"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className={cn(
              inputBase,
              fieldErrors.password ? inputError : inputNormal,
              'pr-12', // room for show/hide toggle
            )}
          />
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertIcon className="text-red-500 w-3.5 h-3.5 mt-0" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* ── Form-level error banner ─────────────────────────────────────── */}
        {error && (
          <div
            ref={errorRef}
            id="form-error"
            role="alert"
            aria-live="assertive"
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium',
              error.isWarning
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            {error.isWarning
              ? <InfoIcon className="text-amber-500" />
              : <AlertIcon className="text-red-500" />}
            <span>{MSG[error.key]}</span>
          </div>
        )}

        {/* ── Submit button ───────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isDisabled}
          aria-busy={isSubmitting}
          aria-label={isSubmitting ? 'Signing in, please wait' : 'Sign in'}
          className={cn(
            'relative w-full h-12 rounded-lg px-6',
            'bg-brand-primary text-white text-sm font-semibold tracking-wide',
            'transition-all duration-150',
            'hover:bg-brand-primary/90 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
            'flex items-center justify-center gap-2.5',
          )}
        >
          {isSubmitting && (
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
          )}
          <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>

      {/* ── Trust footer ───────────────────────────────────────────────────── */}
      <div className="pt-1 border-t border-slate-100">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V6H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1.5V4.5A3.5 3.5 0 008 1zm2.5 5V4.5a2.5 2.5 0 00-5 0V6h5z" clipRule="evenodd"/>
          </svg>
          Secured with encrypted session cookies · HIPAA-aligned
        </p>
      </div>
    </div>
  );
}