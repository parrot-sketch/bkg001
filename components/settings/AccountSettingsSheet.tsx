'use client';

/**
 * Account Settings Sheet
 * 
 * Secure interface for changing email and password.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    FormDescription,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const emailSchema = z.object({
    newEmail: z.string().email('Invalid email address'),
    currentPassword: z.string().min(1, 'Current password is required'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
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

export function AccountSettingsSheet({ open, onClose, currentEmail }: AccountSettingsSheetProps) {
    const [activeTab, setActiveTab] = useState('email');

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
            const response = await fetch('/api/account/email', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Email updated successfully. Please log in again.');
                emailForm.reset();
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                toast.error(result.error || 'Failed to update email');
            }
        } catch (error) {
            toast.error('An error occurred while updating email');
            console.error(error);
        }
    }

    async function onPasswordSubmit(data: PasswordFormValues) {
        try {
            const response = await fetch('/api/account/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Password updated successfully');
                passwordForm.reset();
                onClose();
            } else {
                toast.error(result.error || 'Failed to update password');
            }
        } catch (error) {
            toast.error('An error occurred while updating password');
            console.error(error);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Account Settings</SheetTitle>
                    <SheetDescription>
                        Manage your email address and password
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="email">Email</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                    </TabsList>

                    {/* Email Tab */}
                    <TabsContent value="email" className="space-y-4 pt-4">
                        <Alert>
                            <Mail className="h-4 w-4" />
                            <AlertDescription>
                                Current email: <strong>{currentEmail}</strong>
                            </AlertDescription>
                        </Alert>

                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Changing your email will log you out. You'll need to log in again with your new email.
                            </AlertDescription>
                        </Alert>

                        <Form {...emailForm}>
                            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                <FormField
                                    control={emailForm.control}
                                    name="newEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="new.email@example.com" {...field} />
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
                                            <FormLabel>Current Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter your current password" {...field} />
                                            </FormControl>
                                            <FormDescription>Required to verify your identity</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                    <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                                        {emailForm.formState.isSubmitting ? 'Updating...' : 'Update Email'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>

                    {/* Password Tab */}
                    <TabsContent value="password" className="space-y-4 pt-4">
                        <Alert>
                            <Lock className="h-4 w-4" />
                            <AlertDescription>
                                Choose a strong password with at least 8 characters
                            </AlertDescription>
                        </Alert>

                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter your current password" {...field} />
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
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter new password" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum 8 characters</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Confirm new password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                    <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                        {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
