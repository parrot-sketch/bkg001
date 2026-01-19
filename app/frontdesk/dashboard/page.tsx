'use client';

/**
 * Assistant Console
 * 
 * Surgical Assistant's main workspace showing:
 * - Today's priorities for the surgeon
 * - New inquiries requiring review
 * - Inquiries awaiting clarification
 * - Sessions awaiting scheduling
 * - Today's confirmed sessions
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, CheckCircle, Clock, Bell, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { format, isToday, startOfDay } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<AppointmentResponseDto[]>([]);
  const [pendingConsultations, setPendingConsultations] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load today's appointments and pending consultations in parallel
      const [todayResponse, pendingResponse] = await Promise.all([
        frontdeskApi.getTodayAppointments(),
        frontdeskApi.getPendingConsultations(),
      ]);

      if (todayResponse.success && todayResponse.data) {
        setTodayAppointments(todayResponse.data);
      } else if (!todayResponse.success) {
        console.error('Failed to load today\'s appointments:', todayResponse.error);
      }

      if (pendingResponse.success && pendingResponse.data) {
        setPendingConsultations(pendingResponse.data);
      } else if (!pendingResponse.success) {
        console.error('Failed to load pending consultations:', pendingResponse.error);
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

  // Consultation request stats
  const newInquiries = pendingConsultations.filter(
    (apt) => apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
             apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW,
  ).length;
  const awaitingClarification = pendingConsultations.filter(
    (apt) => apt.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO,
  ).length;
  const awaitingScheduling = pendingConsultations.filter(
    (apt) => apt.consultationRequestStatus === ConsultationRequestStatus.APPROVED,
  ).length;

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          Assistant Console
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Today's priorities and inquiries requiring attention
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Today's Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{expectedPatients}</div>
            <p className="text-xs text-gray-500">Confirmed sessions</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Arrived</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{checkedInPatients}</div>
            <p className="text-xs text-gray-500">Clients checked in</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Awaiting Arrival</CardTitle>
            <Bell className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{pendingCheckIns}</div>
            <p className="text-xs text-gray-500">Expected today</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Inquiries for Review</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{newInquiries}</div>
            <p className="text-xs text-gray-500">New consultation inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Consultation Requests */}
      {(newInquiries > 0 || awaitingClarification > 0 || awaitingScheduling > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inquiries Requiring Attention</CardTitle>
                <CardDescription>Consultation requests that need your review or action</CardDescription>
              </div>
              <Link href="/frontdesk/appointments?status=PENDING">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* New Inquiries */}
              {newInquiries > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">New Inquiries</p>
                        <p className="text-sm text-muted-foreground">
                          {newInquiries} {newInquiries === 1 ? 'inquiry' : 'inquiries'} awaiting review
                        </p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=SUBMITTED,PENDING_REVIEW">
                      <Button size="sm">Review</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Awaiting Clarification */}
              {awaitingClarification > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-foreground">Awaiting Clarification</p>
                        <p className="text-sm text-muted-foreground">
                          {awaitingClarification} {awaitingClarification === 1 ? 'inquiry' : 'inquiries'} waiting for patient response
                        </p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=NEEDS_MORE_INFO">
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Awaiting Scheduling */}
              {awaitingScheduling > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-teal-600" />
                      <div>
                        <p className="font-medium text-foreground">Awaiting Scheduling</p>
                        <p className="text-sm text-muted-foreground">
                          {awaitingScheduling} {awaitingScheduling === 1 ? 'inquiry' : 'inquiries'} accepted, ready to schedule
                        </p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=APPROVED">
                      <Button variant="outline" size="sm">Schedule</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Sessions</CardTitle>
              <CardDescription>Confirmed sessions for {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
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
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No sessions scheduled for today</p>
              <p className="text-xs text-gray-500">Check upcoming sessions or review new inquiries</p>
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
