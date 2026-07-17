import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { getPostAuthRedirect } from '@/lib/utils/auth-redirect';
import { classify, getSafeRedirectUrl, validateLoginForm, MsgKey } from '@/lib/utils/auth-helpers';

export interface UseLoginFormReturn {
  email: string;
  password: string;
  isSubmitting: boolean;
  isNavigating: boolean;
  isAuthLoading: boolean;
  isDisabled: boolean;
  sessionExpired: boolean;
  error: { key: MsgKey; isWarning?: boolean } | null;
  fieldErrors: { email?: string; password?: string };
  emailRef: React.RefObject<HTMLInputElement | null>;
  passwordRef: React.RefObject<HTMLInputElement | null>;
  errorRef: React.RefObject<HTMLDivElement | null>;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

/**
 * Custom hook to encapsulate the login form states,
 * focus references, field validation, and login API orchestration.
 */
export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<{ key: MsgKey; isWarning?: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const isDisabled = isSubmitting || isNavigating;
  const sessionExpired = searchParams.get('reason') === 'expired';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setFieldErrors(prev => (prev.email ? { ...prev, email: undefined } : prev));
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setFieldErrors(prev => (prev.password ? { ...prev, password: undefined } : prev));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isNavigating) return;

    // Reset errors
    setError(null);
    setFieldErrors({});

    // Field Validation
    const errs = validateLoginForm(email, password);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      if (errs.email) {
        emailRef.current?.focus();
      } else if (errs.password) {
        passwordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);

      // Transition to routing phase (keeps button spinner active)
      setIsNavigating(true);

      const redirect = await getPostAuthRedirect(
        loggedInUser?.id ?? email.trim(),
        loggedInUser?.role,
      );
      
      const safeRedirect = getSafeRedirectUrl(redirect, '/');
      router.push(safeRedirect);
    } catch (err: unknown) {
      setIsNavigating(false);
      const status = (err as any)?.status ?? (err as any)?.response?.status ?? 0;
      const message = err instanceof Error ? err.message : String(err);
      
      const key = classify(status, message);
      setError({
        key,
        isWarning: key === 'NETWORK_ERROR' || key === 'RATE_LIMITED' || key === 'ACCOUNT_LOCKED',
      });

      // Refocus inputs appropriately
      if (key === 'AUTH_ERROR' || key === 'NETWORK_ERROR') {
        passwordRef.current?.focus();
        passwordRef.current?.select();
      } else {
        emailRef.current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, isSubmitting, isNavigating, login, router]);

  // Scroll form error alert into view on mobile
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  return {
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
  };
}
