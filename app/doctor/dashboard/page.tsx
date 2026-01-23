'use client';

/**
 * Surgeon Dashboard
 * 
 * Clean, minimal view showing only:
 * - Today's confirmed sessions
 * - Upcoming confirmed sessions
 * - Patient notes and procedure information
 * 
 * No noise. No rejected inquiries. No drafts. No pending items.
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hooks
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorTodayAppointments, useDoctorUpcomingAppointments } from '@/hooks/doctor/useDoctorDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, FileText, Bell } from 'lucide-react';
import Link from 'next/link';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { TheatreScheduleView } from '@/components/doctor/TheatreScheduleView';
import { PostOpDashboard } from '@/components/doctor/PostOpDashboard';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // REFACTORED: Replaced manual useState/useEffect with React Query
  // React Query handles: loading, error, retries, caching, deduplication automatically
  const { 
    data: todayAppointments = [], 
    isLoading: loadingToday 
  } = useDoctorTodayAppointments(user?.id, isAuthenticated && !!user);
  
  const { 
    data: upcomingAppointments = [], 
    isLoading: loadingUpcoming 
  } = useDoctorUpcomingAppointments(user?.id, isAuthenticated && !!user);

  const loading = loadingToday || loadingUpcoming;

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
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const upcomingCount = upcomingAppointments.length;
  const todayCount = todayAppointments.length;

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section - Minimal and calm */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          {user.firstName ? `Dr. ${user.firstName}` : user.email}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your schedule for today and upcoming sessions
        </p>
      </div>

      {/* Quick Stats - Clean and minimal */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Today's Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{todayCount}</div>
            <p className="text-xs text-gray-500">Confirmed sessions</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{upcomingCount}</div>
            <p className="text-xs text-gray-500">Future sessions</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Clients</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <Link href="/doctor/patients">
              <Button variant="ghost" size="sm" className="text-xs -ml-2">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Sessions</CardTitle>
              <CardDescription>Confirmed sessions for {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </div>
            <Link href="/doctor/appointments">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading schedule...</p>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No sessions scheduled for today</p>
              <p className="text-xs text-gray-500">Your schedule is clear</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={false} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your confirmed future sessions</CardDescription>
            </div>
            <Link href="/doctor/appointments">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading sessions...</p>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No upcoming sessions</p>
              <p className="text-xs text-gray-500">Check back later for scheduled sessions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={false} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theatre Schedule View - Surgeon-Centric */}
      <TheatreScheduleView
        cases={todayAppointments.map((apt) => ({
          appointment: apt,
          patientName: `Patient ${apt.patientId}`, // TODO: Fetch patient name from API
          procedure: apt.type || 'Consultation',
          // TODO: Fetch case plan data from API when endpoint is available
          casePlan: undefined,
        }))}
        loading={loading}
      />

      {/* Post-Op Monitoring Dashboard */}
      {/* TODO: Replace with real data from API */}
      <PostOpDashboard cases={[]} loading={false} />
    </div>
  );
}
