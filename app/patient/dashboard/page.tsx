'use client';

/**
 * Patient Dashboard Overview
 * 
 * Main dashboard page showing:
 * - Welcome message
 * - Upcoming appointments
 * - Recent consultations
 * - Quick stats
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { ConsultationCTA } from '@/components/portal/ConsultationCTA';

export default function PatientDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Load appointments on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUpcomingAppointments();
    }
  }, [isAuthenticated, user]);

  // Refresh appointments when window regains focus (user returns from booking or other tab)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && user && !loadingAppointments) {
        loadUpcomingAppointments();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, user, loadingAppointments]);

  const loadUpcomingAppointments = async () => {
    if (!user) return;

    try {
      setLoadingAppointments(true);
      const response = await patientApi.getUpcomingAppointments(user.id);

      if (response.success && response.data) {
        setUpcomingAppointments(response.data);
      } else {
        toast.error(response.error || 'Failed to load appointments');
      }
    } catch (error) {
      toast.error('An error occurred while loading appointments');
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access your dashboard</p>
          <Link href="/patient/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const upcomingCount = upcomingAppointments.length;
  const pendingCount = upcomingAppointments.filter(
    (apt) => apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.SCHEDULED,
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Page Header */}
      <div className="pt-4 sm:pt-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Overview of your appointments and consultations
        </p>
      </div>

      {/* Quick Stats - Mobile Grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border bg-white hover:border-accent/30 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-gray-600 mt-1">Scheduled visits</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white hover:border-accent/30 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white hover:border-accent/30 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Consultations</CardTitle>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">-</div>
            <p className="text-xs text-gray-600 mt-1">View history</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white hover:border-accent/30 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Profile</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <Link href="/patient/profile">
              <Button variant="ghost" size="sm" className="text-xs w-full sm:w-auto">
                Manage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Upcoming Appointments</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">Your scheduled appointments</CardDescription>
            </div>
            <Link href="/patient/appointments">
              <Button variant="outline" size="sm" className="border-border text-gray-600 hover:border-accent/50 hover:text-foreground bg-white">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAppointments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading appointments...</p>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No upcoming appointments</p>
              <div className="flex justify-center">
                <ConsultationCTA variant="outline" className="border-accent/50 text-accent hover:border-accent hover:bg-accent/5" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
