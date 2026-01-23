'use client';

/**
 * Patient Registration Page
 * 
 * Elegant, professional registration page matching login design.
 * Clean, minimal, distraction-free with focus on user experience.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { toast } from 'sonner';
import { Role } from '@/domain/enums/Role';
import { getPostAuthRedirect } from '@/lib/utils/auth-redirect';

export default function PatientRegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const generatedUserId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await register({
        id: generatedUserId,
        email: formData.email.trim(),
        password: formData.password,
        role: Role.PATIENT,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
      });

      await login(formData.email.trim(), formData.password);

      toast.success('Account created successfully');
      
      // Intelligent redirect based on user role
      // Get user ID and role from stored auth state after login
      const { tokenStorage } = await import('@/lib/auth/token');
      const storedUser = tokenStorage.getUser();
      const userIdentifier = storedUser?.id || generatedUserId; // Use generated userId if storedUser not available yet
      const userRole = storedUser?.role || Role.PATIENT; // Default to PATIENT for new registrations
      const redirectPath = await getPostAuthRedirect(userIdentifier, userRole);
      router.push(redirectPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const isDisabled = isSubmitting;

  return (
    <div className="space-y-8">
      {/* Header - Clean Typography Hierarchy */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Create Account
        </h1>
        <p className="text-sm text-gray-600">
          Start your journey with us
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-slate-900">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              required
              disabled={isDisabled}
              className={`h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${
                errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            {errors.firstName && (
              <p id="firstName-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-slate-900">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              required
              disabled={isDisabled}
              className={`h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${
                errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            {errors.lastName && (
              <p id="lastName-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-900">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
            disabled={isDisabled}
            className={`h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${
              errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field - Optional */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-slate-900">
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={isDisabled}
            className="h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-900">
            Password
          </Label>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
            disabled={isDisabled}
            minLength={8}
            className={`h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${
              errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            showCapsLockWarning={true}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-900">
            Confirm Password
          </Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            required
            disabled={isDisabled}
            minLength={8}
            className={`h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${
              errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            showCapsLockWarning={true}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors shadow-sm hover:shadow mt-1"
          disabled={isDisabled}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Footer Link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}