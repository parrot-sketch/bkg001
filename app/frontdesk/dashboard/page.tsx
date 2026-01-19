'use client';

/**
 * Frontdesk Dashboard Overview
 * 
 * Main dashboard page showing:
 * - Welcome message
 * - Quick stats (today's patients, check-ins, pending consultations)
 * - Today's appointments
 * - Pending check-ins
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/patient/useAuth';
import { frontdeskApi } from '../../../../lib/api/frontdesk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Calendar, Users, CheckCircle, Clock, Bell } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '../../../../application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { format, isToday, startOfDay } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await frontdeskApi.getTodayAppointments();

      if (response.success && response.data) {
        setTodayAppointments(response.data);
      } else {
        toast.error(response.error || 'Failed to load today\'s appointments');
      }
    } catch (error) {
      toast.error('An error occurred while loading dashboard data');
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

  const expectedPatients = todayAppointments.length;
  const checkedInPatients = todayAppointments.filter(
    (apt) => apt.status === AppointmentStatus.SCHEDULED,
  ).length;
  const pendingCheckIns = todayAppointments.filter(
    (apt) => apt.status === AppointmentStatus.PENDING,
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user.firstName || user.email}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of today's appointments and patient arrivals
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expectedPatients}</div>
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInPatients}</div>
            <p className="text-xs text-muted-foreground">Patients arrived</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Check-in</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCheckIns}</div>
            <p className="text-xs text-muted-foreground">Awaiting arrival</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Consultations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAppointments.filter(
                (apt) =>
                  apt.status === AppointmentStatus.SCHEDULED &&
                  new Date(apt.appointmentDate) <= new Date(),
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for consultation</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Appointments</CardTitle>
              <CardDescription>Appointments scheduled for {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </div>
            <Link href="/frontdesk/appointments">
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
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.slice(0, 10).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
