'use client';

/**
 * Login Page — Nairobi Sculpt
 *
 * Enterprise-grade, WCAG AA compliant authentication page.
 * Audited, Refactored, and Modularized:
 * - Separated styling and presentation from stateful business logic.
 * - Form state, validation, focus, and API operations managed in useLoginForm hook.
 * - Pure error messages, classification, and URL filters managed in auth-helpers.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { MSG } from '@/lib/utils/auth-helpers';
import { cn } from '@/lib/utils';

// ─── Helpers (Aesthetic SVG Icons) ───────────────────────────────────────────
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

  // ── Shared input styles ───────────────────────────────────────────────────
  const inputBase =
    'block w-full rounded-lg border bg-white px-4 text-[15px] text-slate-900 placeholder-slate-400 ' +
    'outline-none transition-all duration-150 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-0 focus-visible:border-brand-primary ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'h-12'; // 48px meets target minimum

  const inputNormal = 'border-slate-300 hover:border-slate-400';
  const inputError  = 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-500 bg-red-50';

  // Render centered skeleton screen on mount ONLY during initial hydration check
  if (isAuthLoading && !isSubmitting && !isNavigating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-pulse" aria-hidden="true">
        <div className="w-16 h-16 rounded-2xl bg-slate-200" />
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-64 bg-slate-100 rounded" />
        <div className="w-full space-y-4 pt-4">
          <div className="h-12 bg-slate-100 rounded-lg w-full" />
          <div className="h-12 bg-slate-100 rounded-lg w-full" />
          <div className="h-12 bg-brand-primary/10 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Heading ──────────────────────────────────────────────────────── */}
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded',
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
            className={cn(
              inputBase,
              fieldErrors.password ? inputError : inputNormal,
              'pr-12', // room for toggle
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
          aria-busy={isDisabled}
          aria-label={isDisabled ? 'Signing in, please wait' : 'Sign in'}
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
          {isDisabled && (
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
          )}
          <span>{isDisabled ? 'Signing in…' : 'Sign in'}</span>
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