'use client';

/**
 * Nurse Profile Page
 * 
 * View nurse profile information.
 * Allows viewing personal details.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function NurseProfilePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="firstName" value={user.firstName || ''} disabled className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={user.lastName || ''} disabled />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={user.email || ''} disabled className="pl-10" />
              </div>
            </div>

            {user.phone && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" type="tel" value={user.phone || ''} disabled className="pl-10" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={user.role || 'NURSE'} disabled />
            </div>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>Profile updates are managed by administrators. Please contact support to update your information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
