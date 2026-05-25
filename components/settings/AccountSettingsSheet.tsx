'use client';

/**
 * Account Settings Sheet
 *
 * Credential management: update email and password.
 * Calm, clinical UI with clear outcomes.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

const emailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
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

export function AccountSettingsSheet({
  open,
  onClose,
  currentEmail,
}: AccountSettingsSheetProps) {
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

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

  async function onEmailSubmit(data: EmailFormValues) {
    try {
      setEmailSaving(true);
      const result = await apiClient.put('/account/email', data);
      if (!result.success) {
        toast.error(result.error || 'Failed to update email');
        return;
      }

      // Clear cookies immediately and force re-auth.
      await apiClient.post('/auth/logout', {});
      toast.success('Email updated. Please log in again.');
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

      toast.success('Password updated');
      passwordForm.reset();
    } catch (error) {
      toast.error('An error occurred while updating password');
      console.error(error);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Account settings</SheetTitle>
          <SheetDescription>Manage your credentials.</SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          <section className="border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Email</div>
              <div className="text-xs text-slate-500 mt-1">Current: {currentEmail}</div>
            </div>
            <div className="p-5">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@domain.com" {...field} />
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
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Required to confirm" {...field} />
                        </FormControl>
                        <FormDescription>
                          After updating your email, you will be signed out.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-none">
                      Close
                    </Button>
                    <Button type="submit" disabled={emailSaving} className="rounded-none">
                      {emailSaving ? 'Updating…' : 'Update email'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Password</div>
              <div className="text-xs text-slate-500 mt-1">Use a strong password (8+ characters).</div>
            </div>
            <div className="p-5">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
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
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormDescription>Minimum 8 characters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm new password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-none">
                      Close
                    </Button>
                    <Button type="submit" disabled={passwordSaving} className="rounded-none">
                      {passwordSaving ? 'Updating…' : 'Update password'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

