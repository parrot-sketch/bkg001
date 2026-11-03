'use client';

/**
 * Account Settings Sheet
 *
 * Two focused actions: change email, or change password.
 * Forms reset on open so browser autofill does not leave stale values.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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
  currentPassword: z.string().min(1, 'Enter your current password'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CredentialTab = 'email' | 'password';

interface AccountSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  name,
  autoComplete,
  show,
  onToggleShow,
  inputRef,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  id: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        className="h-10 rounded-md border-[#e7d6bf] pr-11 text-[#2c2e4b] focus-visible:ring-[#caa26a]"
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
  const [tab, setTab] = useState<CredentialTab>('password');
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showEmailCurrent, setShowEmailCurrent] = useState(false);
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fresh empty forms every time the sheet opens — avoids autofill / stale values
  useEffect(() => {
    if (!open) return;
    setTab('password');
    setShowEmailCurrent(false);
    setShowPasswordCurrent(false);
    setShowPasswordNew(false);
    setShowPasswordConfirm(false);
    emailForm.reset({ newEmail: '', currentPassword: '' });
    passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, [open, currentEmail]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only on open/email change

  async function onEmailSubmit(data: EmailFormValues) {
    const next = data.newEmail.trim().toLowerCase();
    if (next === currentEmail.trim().toLowerCase()) {
      toast.error('Enter a different email than your current one.');
      return;
    }

    try {
      setEmailSaving(true);
      const result = await apiClient.put('/account/email', {
        newEmail: next,
        currentPassword: data.currentPassword,
      });
      if (!result.success) {
        toast.error(result.error || 'Could not update email');
        return;
      }

      toast.success('Email updated. Sign in with your new email.');
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        /* continue to login */
      }
      window.location.href = '/login';
    } catch (error) {
      console.error(error);
      toast.error('Could not update email');
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
        toast.error(result.error || 'Could not update password');
        return;
      }

      toast.success('Password updated. Sign in again.');
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        /* continue to login */
      }
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 400);
    } catch (error) {
      console.error(error);
      toast.error('Could not update password');
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
      <SheetContent className="w-full overflow-y-auto border-l border-[#e7d6bf] bg-white p-0 sm:max-w-md">
        <div className="border-b border-[#e7d6bf] bg-[#2c2e4b] px-5 py-4">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="text-lg font-semibold text-white">
              Sign-in & security
            </SheetTitle>
            <SheetDescription className="text-sm text-[#e7d6bf]">
              Signed in as{' '}
              <span className="font-medium text-white">{currentEmail || '—'}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="grid grid-cols-2 gap-1 border-b border-[#e7d6bf] bg-[#e7d6bf]/25 p-1.5">
          {(
            [
              { id: 'password' as const, label: 'Change password' },
              { id: 'email' as const, label: 'Change email' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'h-9 text-xs font-semibold transition-colors',
                tab === item.id
                  ? 'bg-white text-[#2c2e4b] shadow-sm'
                  : 'text-[#2c2e4b]/65 hover:text-[#2c2e4b]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {tab === 'password' ? (
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
                autoComplete="off"
              >
                <p className="text-xs leading-relaxed text-[#2c2e4b]/65">
                  Use at least 8 characters with upper and lower case letters and a number. You
                  will be signed out after saving.
                </p>

                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]">
                        Current password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="acct-pw-current"
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          autoComplete="current-password"
                          show={showPasswordCurrent}
                          onToggleShow={() => setShowPasswordCurrent((v) => !v)}
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
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]">
                        New password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="acct-pw-new"
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          autoComplete="new-password"
                          show={showPasswordNew}
                          onToggleShow={() => setShowPasswordNew((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]">
                        Confirm new password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="acct-pw-confirm"
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          autoComplete="new-password"
                          show={showPasswordConfirm}
                          onToggleShow={() => setShowPasswordConfirm((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={passwordSaving}
                  className="h-10 w-full rounded-md bg-[#caa26a] text-sm font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-4"
                autoComplete="off"
              >
                <p className="text-xs leading-relaxed text-[#2c2e4b]/65">
                  Enter the new email you want to use, then confirm with your current password.
                  You will be signed out after saving.
                </p>

                <div className="border border-[#e7d6bf] bg-[#e7d6bf]/20 px-3 py-2.5 text-sm text-[#2c2e4b]">
                  Current email
                  <div className="mt-0.5 font-semibold break-all">{currentEmail || '—'}</div>
                </div>

                <FormField
                  control={emailForm.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]">
                        New email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          inputMode="email"
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder=""
                          className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
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
                      <FormLabel className="text-xs font-medium text-[#2c2e4b]">
                        Current password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="acct-email-pw"
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          autoComplete="current-password"
                          show={showEmailCurrent}
                          onToggleShow={() => setShowEmailCurrent((v) => !v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={emailSaving}
                  className="h-10 w-full rounded-md bg-[#003b53] text-sm font-semibold text-white hover:bg-[#005f73]"
                >
                  {emailSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update email'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
