'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { MSG } from '@/lib/utils/auth-helpers';
import { cn } from '@/lib/utils';

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('w-4 h-4 shrink-0 mt-0.5', className)} aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 001.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn('w-4 h-4', className)} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10H5M7 14l-4-4 4-4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('w-3.5 h-3.5', className)} aria-hidden="true">
      <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75zm4.196 5.954a.75.75 0 00-1.114-1.004l-3.362 3.73-1.36-1.412a.75.75 0 10-1.08 1.04l1.91 1.984a.75.75 0 001.097-.018l3.91-4.32z" clipRule="evenodd" />
    </svg>
  );
}

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

  const [step, setStep] = useState<'email' | 'password'>('email');

  useEffect(() => {
    if (step === 'email' && emailRef.current) {
      emailRef.current.focus();
    }
    if (step === 'password' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step, emailRef, passwordRef]);

  useEffect(() => {
    emailRef.current?.focus();
  }, [emailRef]);

  const inputBase =
    'block w-full h-[52px] rounded-lg border px-4 text-[15px] ' +
    'bg-white/10 sm:bg-[#fbfaf8] text-white sm:text-[#2c2e4b] placeholder:text-white/50 sm:placeholder:text-[#8b8994] ' +
    'backdrop-blur-md sm:backdrop-blur-none outline-none transition-all duration-200 ' +
    'border-white/25 sm:border-[#e4e1e6] hover:border-white/40 sm:hover:border-[#c9c5cf] ' +
    'focus-visible:ring-[3px] focus-visible:ring-[#caa26a]/40 sm:focus-visible:ring-[#caa26a]/25 focus-visible:border-[#caa26a] focus-visible:bg-white/15 sm:focus-visible:bg-white ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  const inputNormal = '';
  const inputError = 'border-red-400/60 bg-red-500/10 sm:border-red-300 sm:bg-red-50 focus-visible:ring-red-400/30 focus-visible:border-red-400';

  if (isAuthLoading && !isSubmitting && !isNavigating) {
    return (
      <div className="w-full max-w-md space-y-4" aria-label="Loading authentication">
        <div className="h-12 w-12 rounded-2xl bg-white/15 sm:bg-[#eee9e2] animate-pulse mx-auto" />
        <div className="h-[52px] w-full bg-white/15 sm:bg-[#eee9e2] rounded-lg animate-pulse" />
        <div className="h-[52px] w-full bg-white/15 sm:bg-[#eee9e2] rounded-lg animate-pulse" />
      </div>
    );
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email.trim()) {
      e.preventDefault();
      setStep('password');
    }
  };

  const handleBack = () => setStep('email');

  return (
    <div className="flex flex-col items-center w-full max-w-md px-5 sm:px-0">
      <div className="relative w-full sm:rounded-2xl sm:bg-white sm:shadow-[0_25px_70px_-20px_rgba(15,16,38,0.5)] sm:border sm:border-white overflow-hidden">
        <div className="p-0 sm:p-9 space-y-7">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1
                className="text-xl font-bold text-white sm:text-[#2c2e4b] leading-tight"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                Nairobi Sculpt
              </h1>
              <p className="text-[13px] text-white/70 sm:text-[#8b8994] mt-0.5">
                {step === 'email' ? 'Sign in to your clinical workspace' : 'Enter your password to continue'}
              </p>
            </div>
          </div>

          {sessionExpired && !error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-white/20 sm:border-[#caa26a]/30 bg-white/10 sm:bg-[#f7f0e6] px-4 py-3 text-sm text-white sm:text-[#8a6a2f]"
              role="status"
              aria-live="polite"
            >
              <InfoIcon className="text-[#caa26a] shrink-0 mt-0.5" />
              <span>{MSG.SESSION_EXPIRED}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Sign in form">
            {step === 'email' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-[13px] font-semibold text-white sm:text-[#2c2e4b] tracking-wide">
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
                    onKeyDown={handleEmailKeyDown}
                    disabled={isDisabled}
                    required
                    aria-required="true"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={cn(inputBase, fieldErrors.email ? inputError : inputNormal)}
                  />
                  {fieldErrors.email && (
                    <p id="email-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-300 sm:text-red-500 font-medium">
                      <AlertIcon className="text-red-300 sm:text-red-500 w-3.5 h-3.5 mt-0" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => email.trim() && setStep('password')}
                  disabled={isDisabled || !email.trim()}
                  className={cn(
                    'w-full h-[52px] rounded-lg px-6',
                    'bg-[#caa26a] text-[#2c2e4b] text-[15px] font-semibold',
                    'transition-all duration-200',
                    'hover:bg-[#bd9257] active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#caa26a]/25',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
                    'shadow-sm',
                  )}
                >
                  Continue
                </button>
              </div>
            )}

            {step === 'password' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 -ml-1.5 px-1.5 py-1 text-[13px] text-white/70 sm:text-[#8b8994] hover:text-white sm:hover:text-[#2c2e4b] rounded-lg transition-colors"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[220px]">{email}</span>
                </button>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-[13px] font-semibold text-white sm:text-[#2c2e4b] tracking-wide">
                      Password
                    </label>
                    <Link
                      href="/patient/forgot-password"
                      className="text-xs font-medium text-[#caa26a] sm:text-[#b8913e] underline-offset-2 hover:underline transition-colors"
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
                    <p id="password-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-300 sm:text-red-500 font-medium">
                      <AlertIcon className="text-red-300 sm:text-red-500 w-3.5 h-3.5 mt-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    ref={errorRef}
                    id="form-error"
                    role="alert"
                    aria-live="assertive"
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium',
                      error.isWarning
                        ? 'border-white/20 sm:border-[#caa26a]/30 bg-white/10 sm:bg-[#f7f0e6] text-white sm:text-[#8a6a2f]'
                        : 'border-red-400/40 sm:border-red-200 bg-red-500/10 sm:bg-red-50 text-red-200 sm:text-red-700',
                    )}
                  >
                    {error.isWarning
                      ? <InfoIcon className="text-[#caa26a] shrink-0 mt-0.5" />
                      : <AlertIcon className="text-red-300 sm:text-red-500 shrink-0 mt-0.5" />}
                    <span>{MSG[error.key]}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDisabled}
                  aria-busy={isDisabled}
                  aria-label={isDisabled ? 'Signing in, please wait' : 'Sign in'}
                  className={cn(
                    'w-full h-[52px] rounded-lg px-6',
                    'bg-[#caa26a] text-[#2c2e4b] text-[15px] font-semibold',
                    'transition-all duration-200',
                    'hover:bg-[#bd9257] active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#caa26a]/25',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                    'flex items-center justify-center gap-2.5 shadow-sm',
                  )}
                >
                  {isDisabled && (
                    <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-[#2c2e4b]/30 border-t-[#2c2e4b] animate-spin" />
                  )}
                  <span>{isDisabled ? 'Signing in…' : 'Sign in'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-6 text-[11px] font-medium text-white/80">
        <ShieldIcon className="text-white/60" />
        <span>Tibaflow· Powered By BKG-Consulting Africa</span>
      </div>
    </div>
  );
}