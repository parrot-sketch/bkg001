'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, AlertCircle } from 'lucide-react';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { WorkspaceIdentity } from '@/components/auth/WorkspaceIdentity';
import { SecureWorkspaceBadge } from '@/components/auth/SecureWorkspaceBadge';

import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { MSG } from '@/lib/utils/auth-helpers';
import { cn } from '@/lib/utils';

function LoginForm() {
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
    if (step === 'email') {
      emailRef.current?.focus();
      return;
    }

    passwordRef.current?.focus();
  }, [step, emailRef]);

  useEffect(() => {
    emailRef.current?.focus();
  }, [emailRef]);

  const inputBase = cn(
    'block w-full h-12 rounded-md border px-4',
    'text-[15px] text-[#16283D]',
    'bg-white placeholder:text-[#98A2AF]',
    'outline-none transition-all duration-150',
    'border-[#D8DEE6]',
    'hover:border-[#B9C3CE]',
    'focus-visible:border-[#102F52]',
    'focus-visible:ring-[3px] focus-visible:ring-[#102F52]/10',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

  const inputError = cn(
    'border-red-300',
    'bg-red-50/30',
    'focus-visible:border-red-400',
    'focus-visible:ring-red-400/10',
  );

  const primaryButton = cn(
    'inline-flex w-full h-12 items-center justify-center gap-2.5',
    'rounded-md px-6',
    'bg-[#102F52] text-[14px] font-semibold text-white',
    'transition-all duration-150',
    'hover:bg-[#0B2743]',
    'active:scale-[0.99]',
    'focus-visible:outline-none',
    'focus-visible:ring-4 focus-visible:ring-[#102F52]/10',
    'disabled:cursor-not-allowed disabled:opacity-45',
  );

  if (isAuthLoading && !isSubmitting && !isNavigating) {
    return (
      <div
        className="w-full animate-pulse"
        aria-label="Loading authentication"
      >
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-[#E7EAEE]" />
          <div className="h-3.5 w-24 rounded bg-[#EEF0F2]" />
        </div>

        <div className="mt-10 space-y-3">
          <div className="h-3 w-20 rounded bg-[#E7EAEE]" />
          <div className="h-12 w-full rounded-md bg-[#EEF0F2]" />
          <div className="h-12 w-full rounded-md bg-[#E7EAEE]" />
        </div>
      </div>
    );
  }

  const handleEmailKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter' && email.trim()) {
      event.preventDefault();
      setStep('password');
    }
  };

  return (
    <div className="w-full">
      {/* Workspace identity */}
      <WorkspaceIdentity />

      {/* Session expired */}
      {sessionExpired && !error && (
        <div
          className={cn(
            'mt-7 flex items-start gap-2.5',
            'border-l-2 border-[#C7A45D]',
            'bg-[#FBF8F0]',
            'px-3.5 py-3',
            'text-[13px] leading-5 text-[#7F642C]',
          )}
          role="status"
          aria-live="polite"
        >
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[#B08B43]"
            aria-hidden="true"
          />

          <span>{MSG.SESSION_EXPIRED}</span>
        </div>
      )}

      {/* Authentication form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-10"
        aria-label="Sign in form"
      >
        {/* Email step */}
        {step === 'email' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-[12px] font-semibold tracking-wide text-[#334155]"
              >
                Work email
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
                aria-describedby={
                  fieldErrors.email ? 'email-error' : undefined
                }
                className={cn(
                  inputBase,
                  fieldErrors.email && inputError,
                )}
              />

              {fieldErrors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />

                  {fieldErrors.email}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (email.trim()) {
                  setStep('password');
                }
              }}
              disabled={isDisabled || !email.trim()}
              className={primaryButton}
            >
              Continue
            </button>
          </div>
        )}

        {/* Password step */}
        {step === 'password' && (
          <div className="space-y-5">
            {/* Account / back control */}
            <button
              type="button"
              onClick={() => setStep('email')}
              className={cn(
                'group -ml-1 flex items-center gap-1.5',
                'rounded-md px-1 py-1',
                'text-[12px] text-[#7C8795]',
                'transition-colors duration-150',
                'hover:text-[#102F52]',
                'focus:outline-none focus:ring-2 focus:ring-[#102F52]/10',
              )}
            >
              <ChevronLeft
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />

              <span className="max-w-[250px] truncate">
                {email}
              </span>
            </button>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="password"
                  className="block text-[12px] font-semibold tracking-wide text-[#334155]"
                >
                  Password
                </label>

                <Link
                  href="/patient/forgot-password"
                  className={cn(
                    'shrink-0 text-xs font-medium',
                    'text-[#526A82]',
                    'transition-colors duration-150',
                    'hover:text-[#102F52]',
                    'hover:underline hover:underline-offset-4',
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
                aria-describedby={
                  fieldErrors.password
                    ? 'password-error'
                    : undefined
                }
                className={cn(
                  inputBase,
                  fieldErrors.password && inputError,
                )}
              />

              {fieldErrors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0 text-red-500"
                    aria-hidden="true"
                  />

                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Form error */}
            {error && (
              <div
                ref={errorRef}
                id="form-error"
                role="alert"
                aria-live="assertive"
                className={cn(
                  'flex items-start gap-2.5',
                  'border-l-2 px-3.5 py-3',
                  'text-[13px] leading-5',
                  error.isWarning
                    ? 'border-[#C7A45D] bg-[#FBF8F0] text-[#7F642C]'
                    : 'border-red-400 bg-red-50/60 text-red-700',
                )}
              >
                {error.isWarning ? (
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#B08B43]"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                    aria-hidden="true"
                  />
                )}

                <span>{MSG[error.key]}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              aria-busy={isDisabled}
              aria-label={
                isDisabled
                  ? 'Signing in, please wait'
                  : 'Sign in'
              }
              className={primaryButton}
            >
              {isDisabled && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              )}

              <span>
                {isDisabled ? 'Signing in…' : 'Sign in'}
              </span>
            </button>
          </div>
        )}
      </form>

      {/* Security / provider information */}
      <div className="mt-10 border-t border-[#E6E9ED] pt-6">
        <SecureWorkspaceBadge />
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="w-full animate-pulse" aria-label="Loading authentication">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-[#E7EAEE]" />
        <div className="h-3.5 w-24 rounded bg-[#EEF0F2]" />
      </div>

      <div className="mt-10 space-y-3">
        <div className="h-3 w-20 rounded bg-[#E7EAEE]" />
        <div className="h-12 w-full rounded-md bg-[#EEF0F2]" />
        <div className="h-12 w-full rounded-md bg-[#E7EAEE]" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
