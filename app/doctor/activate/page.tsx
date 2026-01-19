'use client';

/**
 * Doctor Activation Page
 * 
 * Allows doctors to activate their account via invitation token.
 * Minimal, professional interface with clear states.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doctorInviteApi } from '@/lib/api/doctor-invite';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tokenStorage } from '@/lib/auth/token';

type ActivationState = 'loading' | 'invalid' | 'form' | 'success';

function ActivateDoctorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<ActivationState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setState('invalid');
    } else {
      // Token validation happens on submit
      setState('form');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    if (password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (!token) {
      setState('invalid');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await doctorInviteApi.activateInvite({
        token,
        password,
      });

      if (response.success && response.data) {
        // Store tokens
        tokenStorage.setAccessToken(response.data.accessToken);
        tokenStorage.setRefreshToken(response.data.refreshToken);

        setState('success');

        // Auto-redirect after 2 seconds
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 2000);
      } else if (!response.success) {
        if (response.error?.includes('expired') || response.error?.includes('invalid')) {
          setState('invalid');
        } else {
          setErrors({ general: response.error || 'Failed to activate account' });
        }
      } else {
        setErrors({ general: 'Failed to activate account' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while activating your account' });
      console.error('Error activating account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-700">Preparing your account…</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/Expired token state
  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700">This invitation link is no longer valid.</p>
              <p className="text-xs text-gray-500">Contact the clinic administrator</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700">Your account is now active.</p>
              <p className="text-xs text-gray-500">Redirecting to dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Activation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold text-gray-900">Welcome to Nairobi Sculpt</h1>
              <p className="text-sm text-gray-600">Set a password to activate your account.</p>
            </div>

            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                <p className="text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Activating...' : 'Activate Account'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ActivateDoctorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-700">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ActivateDoctorForm />
    </Suspense>
  );
}
