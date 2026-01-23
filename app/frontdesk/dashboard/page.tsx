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
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hooks
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayAppointments, usePendingConsultations } from '@/hooks/appointments/useAppointments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, CheckCircle, Clock, Bell, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { format, isToday, startOfDay } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { AvailableDoctorsPanel } from '@/components/frontdesk/AvailableDoctorsPanel';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // REFACTORED: Replaced manual useState/useEffect with React Query
  // React Query handles: loading, error, retries, caching, deduplication automatically
  const { 
    data: todayAppointments = [], 
    isLoading: loadingAppointments 
  } = useTodayAppointments(isAuthenticated && !!user);
  
  const { 
    data: pendingConsultations = [], 
    isLoading: loadingConsultations 
  } = usePendingConsultations(isAuthenticated && !!user);

  const loading = loadingAppointments || loadingConsultations;

  // CRITICAL FIX: Move useMemo BEFORE any conditional returns
  // All hooks must be called in the same order on every render
  // REFACTORED: Use useMemo to prevent recalculating stats on every render
  // Note: Backend should ideally return pre-calculated counts, but for now we memoize client-side calculations
  // This is safe because backend limits results (200 appointments max, 100 consultations max)
  const stats = useMemo(() => {
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

    return {
      expectedPatients,
      checkedInPatients,
      pendingCheckIns,
      newInquiries,
      awaitingClarification,
      awaitingScheduling,
    };
  }, [todayAppointments, pendingConsultations]);

  const {
    expectedPatients,
    checkedInPatients,
    pendingCheckIns,
    newInquiries,
    awaitingClarification,
    awaitingScheduling,
  } = stats;

  // Early returns AFTER all hooks are called
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

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
      {/* REFACTORED: Removed titles/subtitles - UI is function-driven */}
      {/* Quick Stats */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{expectedPatients}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Arrived</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{checkedInPatients}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Pending</CardTitle>
            <Bell className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{pendingCheckIns}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Inquiries</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{newInquiries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Consultation Requests - REFACTORED: Removed descriptive text */}
      {(newInquiries > 0 || awaitingClarification > 0 || awaitingScheduling > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inquiries</CardTitle>
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
                <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">New ({newInquiries})</p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=SUBMITTED,PENDING_REVIEW" className="w-full sm:w-auto">
                      <Button size="sm" className="w-full sm:w-auto min-h-[44px]">Review</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Awaiting Clarification */}
              {awaitingClarification > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">Clarification ({awaitingClarification})</p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=NEEDS_MORE_INFO" className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">View</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Awaiting Scheduling */}
              {awaitingScheduling > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">Schedule ({awaitingScheduling})</p>
                      </div>
                    </div>
                    <Link href="/frontdesk/consultations?status=APPROVED" className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">Schedule</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Doctors */}
      <AvailableDoctorsPanel />

      {/* Today's Sessions - REFACTORED: Removed descriptive text */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sessions</CardTitle>
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
              <p className="text-sm font-medium text-gray-600">No sessions today</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* REFACTORED: Limit displayed appointments for performance (backend already limits to 200) */}
              {todayAppointments.slice(0, 10).map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  showDoctorInfo={true} 
                />
              ))}
              {todayAppointments.length > 10 && (
                <div className="text-center pt-2">
                  <Link href="/frontdesk/appointments">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      View All {todayAppointments.length} Appointments
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
