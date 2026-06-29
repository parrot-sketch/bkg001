'use client';

/**
 * Login Page — Nairobi Sculpt
 *
 * Enterprise-grade split-screen authentication.
 * - Branded left panel on desktop
 * - Clean auth form on right
 * - WCAG AA compliant
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { MSG } from '@/lib/utils/auth-helpers';
import { cn } from '@/lib/utils';

// ─── Icons ─────────────────────────────────────────────────────────────────────
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
  const {
    email,
    password,
    isSubmitting,
    isNavigating,
    isAuthLoading,
    isDisabled,
    sessionExpired,
    error,
    fieldErrors,
    emailRef,
    passwordRef,
    errorRef,
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,
  } = useLoginForm();

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, [emailRef]);

  // ── Input styles (8px grid, modern) ─────────────────────────────────────────
  const inputBase =
    'block w-full rounded-xl border bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 ' +
    'outline-none transition-all duration-150 ' +
    'focus-visible:ring-2 focus-visible:ring-[#0c5d69] focus-visible:ring-offset-0 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'h-12';

  const inputNormal = 'border-slate-300 hover:border-slate-400';
  const inputError = 'border-red-300 focus-visible:ring-red-400 bg-red-50';

  // Render loading state during initial hydration
  if (isAuthLoading && !isSubmitting && !isNavigating) {
    return (
      <div className="w-full max-w-sm space-y-5" aria-label="Loading authentication">
        <div className="h-12 w-full bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-12 w-full bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-12 w-full bg-[#0c5d69] opacity-20 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm lg:max-w-md">

      {/* ── Mobile Header ────────────────────────────────────────────────────────── */}
      <div className="flex lg:hidden items-center justify-center mb-8 gap-3">
        <img src="/logo.png" alt="Nairobi Sculpt" className="w-10 h-10" />
        <div>
          <h1 className="text-lg font-bold text-[#0c5d69] tracking-tight" style={{fontFamily: 'var(--font-playfair), Georgia, serif'}}>Nairobi Sculpt</h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">Aesthetic Centre</p>
        </div>
      </div>

      {/* ── Session-expired banner ────────────────────────────────────────────── */}
      {sessionExpired && !error && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-5"
          role="status"
          aria-live="polite"
        >
          <InfoIcon className="text-amber-500" />
          <span>{MSG.SESSION_EXPIRED}</span>
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
        aria-label="Sign in form"
      >
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
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
            onChange={handleEmailChange}
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
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/patient/forgot-password"
              className={cn(
                'text-xs font-medium text-[#0c5d69] underline-offset-2',
                'hover:underline focus-visible:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c5d69] focus-visible:ring-offset-1 rounded',
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
            onChange={handlePasswordChange}
            disabled={isDisabled}
            required
            showCapsLockWarning
            aria-required="true"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className={cn(inputBase, fieldErrors.password ? inputError : inputNormal)}
          />
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertIcon className="text-red-500 w-3.5 h-3.5 mt-0" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* ── Form-level error banner ────────────────────────────────────────── */}
        {error && (
          <div
            ref={errorRef}
            id="form-error"
            role="alert"
            aria-live="assertive"
            className={cn(
              'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium',
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

        {/* ── Submit button ────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isDisabled}
          aria-busy={isDisabled}
          aria-label={isDisabled ? 'Signing in, please wait' : 'Sign in'}
          className={cn(
            'relative w-full h-12 rounded-xl px-6',
            'bg-[#0c5d69] text-white text-sm font-semibold tracking-wide',
            'transition-all duration-150',
            'hover:bg-[#0a4f59] active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c5d69] focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
            'flex items-center justify-center gap-2.5',
          )}
        >
          {isDisabled && (
            <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          <span>{isDisabled ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>

      {/* ── Security footer ────────────────────────────────────────────────────── */}
      <div className="pt-6 mt-8 border-t border-slate-200">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V6H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1.5V4.5A3.5 3.5 0 008 1zm2.5 5V4.5a2.5 2.5 0 00-5 0V6h5z" clipRule="evenodd"/>
          </svg>
          Secured with encrypted session cookies · HIPAA-aligned
        </p>
      </div>
    </div>
  );
}