'use client';

/**
 * Nurse Profile Page
 * 
 * View nurse profile information.
 * Refactored to match modern dashboard aesthetic.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Shield, Calendar } from 'lucide-react';
import Link from 'next/link';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';
import { format } from 'date-fns';

export default function NurseProfilePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-6 max-w-5xl mx-auto">

        <div className="flex flex-col md:flex-row gap-6">

          {/* Sidebar Card */}
          <Card className="md:w-80 h-fit border-slate-200 shadow-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="relative mx-auto h-24 w-24">
                <div className="h-24 w-24 rounded-full ring-4 ring-slate-50 shadow-md bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user.firstName} {user.lastName}</h2>
                <p className="text-slate-500 text-sm">{user.role || 'NURSE'}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 w-full flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span>ID: {user.id.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Joined {format(new Date(), 'MMMM yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base text-slate-900">Personal Information</CardTitle>
                <CardDescription>Manage your contact details and identity</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-700">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="firstName" value={user.firstName || ''} disabled className="pl-10 bg-slate-50/50 border-slate-200" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-700">Last Name</Label>
                    <Input id="lastName" value={user.lastName || ''} disabled className="bg-slate-50/50 border-slate-200" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="email" type="email" value={user.email || ''} disabled className="pl-10 bg-slate-50/50 border-slate-200" />
                    </div>
                  </div>

                  {user.phone && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="phone" type="tel" value={user.phone || ''} disabled className="pl-10 bg-slate-50/50 border-slate-200" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-blue-50/50 p-4 border border-blue-100">
                  <p className="text-xs text-blue-700 flex items-start gap-2">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Profile information is managed by the hospital administrator to ensure accuracy.
                      Please contact HR or IT support if you need to update these details.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
