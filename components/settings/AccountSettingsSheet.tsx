'use client';

/**
 * Account Settings Sheet
 *
 * Credential management: update email and password.
 * Branded clinical UI with password visibility and strength guidance.
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  newEmail: z.string().email('Enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface AccountSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
}

function passwordChecks(password: string) {
  return [
    { id: 'length', label: 'At least 8 characters', ok: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { id: 'number', label: 'One number', ok: /[0-9]/.test(password) },
  ] as const;
}

function PasswordField({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  autoComplete,
  show,
  onToggleShow,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  placeholder: string;
  autoComplete?: string;
  show: boolean;
  onToggleShow: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-10 rounded-md border-[#e7d6bf] pr-11 text-[#2c2e4b] placeholder:text-[#2c2e4b]/40 focus-visible:ring-[#caa26a]"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#2c2e4b]/55 hover:text-[#2c2e4b]"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AccountSettingsSheet({
  open,
  onClose,
  currentEmail,
}: AccountSettingsSheetProps) {
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const watchedNewPassword = passwordForm.watch('newPassword') || '';
  const strength = useMemo(() => passwordChecks(watchedNewPassword), [watchedNewPassword]);
  const strengthScore = strength.filter((c) => c.ok).length;

  async function onEmailSubmit(data: EmailFormValues) {
    try {
      setEmailSaving(true);
      const result = await apiClient.put('/account/email', data);
      if (!result.success) {
        toast.error(result.error || 'Failed to update email');
        return;
      }

      await apiClient.post('/auth/logout', {});
      toast.success('Email updated. Please sign in with your new email.');
      emailForm.reset();
      window.location.href = '/login';
    } catch (error) {
      toast.error('An error occurred while updating email');
      console.error(error);
    } finally {
      setEmailSaving(false);
    }
  }

  async function onPasswordSubmit(data: PasswordFormValues) {
    try {
      setPasswordSaving(true);
      const result = await apiClient.put('/account/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to update password');
        return;
      }

      passwordForm.reset();
      toast.success('Password updated. Please sign in again.');
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        // Continue to login even if logout call fails
      }
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      toast.error('An error occurred while updating password');
      console.error(error);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto border-l border-[#e7d6bf] bg-white p-0 sm:max-w-xl">
        <div className="border-b border-[#e7d6bf] bg-[#2c2e4b] px-5 py-5 sm:px-6">
          <SheetHeader className="space-y-1 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#caa26a]">
              Account security
            </p>
            <SheetTitle className="text-xl font-semibold text-white">
              Sign-in & credentials
            </SheetTitle>
            <SheetDescription className="text-sm text-[#e7d6bf]">
              Update the email or password you use for NSAC clinic access. You can show passwords
              while typing to avoid mistakes.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-0">
          {/* Email */}
          <section className="border-b border-[#e7d6bf] px-5 py-6 sm:px-6">
            <div className="mb-5 flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#e7d6bf] bg-[#e7d6bf]/30 text-[#005f73]">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#2c2e4b]">Email address</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[#2c2e4b]/65">
                  Changing email signs you out so you can sign in with the new address.
                </p>
              </div>
            </div>

            <div className="mb-4 border border-[#e7d6bf] bg-[#e7d6bf]/20 px-3.5 py-2.5 text-sm text-[#2c2e4b]">
              Current email:{' '}
              <span className="font-semibold">{currentEmail || '—'}</span>
            </div>

            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]/75">
                        New email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@clinic.com"
                          autoComplete="email"
                          className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]/75">
                        Current password
                      </FormLabel>
                      <FormControl>
                        <PasswordField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          placeholder="Confirm it’s you"
                          autoComplete="current-password"
                          show={showEmailPassword}
                          onToggleShow={() => setShowEmailPassword((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={emailSaving}
                    className="h-9 rounded-md bg-[#003b53] px-4 text-xs font-semibold text-white hover:bg-[#005f73]"
                  >
                    {emailSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      'Update email'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </section>

          {/* Password */}
          <section className="px-5 py-6 sm:px-6">
            <div className="mb-5 flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#e7d6bf] bg-[#e7d6bf]/30 text-[#005f73]">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#2c2e4b]">Password</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[#2c2e4b]/65">
                  Choose a strong personal password. You’ll sign in again after it updates.
                </p>
              </div>
            </div>

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]/75">
                        Current password
                      </FormLabel>
                      <FormControl>
                        <PasswordField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          show={showCurrentPassword}
                          onToggleShow={() => setShowCurrentPassword((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]/75">
                        New password
                      </FormLabel>
                      <FormControl>
                        <PasswordField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          placeholder="Create a new password"
                          autoComplete="new-password"
                          show={showNewPassword}
                          onToggleShow={() => setShowNewPassword((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Strength checklist */}
                <div className="border border-[#e7d6bf] bg-[#e7d6bf]/15 px-3.5 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2c2e4b]/60">
                      Password strength
                    </p>
                    <p className="text-[11px] font-medium text-[#2c2e4b]">
                      {strengthScore === 0
                        ? 'Start typing'
                        : strengthScore < 4
                          ? 'Keep going'
                          : 'Ready'}
                    </p>
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1',
                          i < strengthScore ? 'bg-[#005f73]' : 'bg-[#e7d6bf]',
                        )}
                      />
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {strength.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          'flex items-center gap-2 text-xs',
                          item.ok ? 'text-[#005f73]' : 'text-[#2c2e4b]/55',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center border',
                            item.ok
                              ? 'border-[#005f73] bg-[#005f73] text-white'
                              : 'border-[#e7d6bf] bg-white',
                          )}
                        >
                          {item.ok ? <Check className="h-2.5 w-2.5" /> : null}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]/75">
                        Confirm new password
                      </FormLabel>
                      <FormControl>
                        <PasswordField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          show={showConfirmPassword}
                          onToggleShow={() => setShowConfirmPassword((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-start gap-2 border border-[#caa26a]/35 bg-[#caa26a]/10 px-3 py-2.5 text-xs text-[#2c2e4b]">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#caa26a]" />
                  <span>
                    After updating, active sessions are cleared and you’ll sign in with the new
                    password.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="h-9 rounded-md border-[#e7d6bf] px-3 text-xs text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="h-9 rounded-md bg-[#caa26a] px-4 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      'Update password'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
