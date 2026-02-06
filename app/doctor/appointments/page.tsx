'use client';

/**
 * Doctor Appointments Page
 * 
 * View and manage all appointments assigned to the doctor.
 * Includes check-in, consultation start/complete actions.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, FileText, CalendarDays, Filter, ChevronDown, Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format } from 'date-fns';
import { CompleteConsultationDialog } from '@/components/doctor/CompleteConsultationDialog';
import { DoctorAppointmentCardEnhanced } from '@/components/doctor/DoctorAppointmentCardEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showCompleteConsultation, setShowCompleteConsultation] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAppointments();
    }
  }, [isAuthenticated, user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // getAppointments now uses the new endpoint which filters to only SCHEDULED/CONFIRMED
      // by default, ensuring doctors never see unreviewed consultation requests
      const response = await doctorApi.getAppointments(user.id);

      if (response.success && response.data) {
        setAppointments(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load appointments');
      } else {
        toast.error('Failed to load appointments');
      }
    } catch (error) {
      toast.error('An error occurred while loading appointments');
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId: number) => {
    if (!user) return;

    try {
      const response = await doctorApi.checkInPatient(appointmentId, user.id);

      if (response.success) {
        toast.success('Patient checked in successfully');
        loadAppointments();
      } else if (!response.success) {
        toast.error(response.error || 'Failed to check in patient');
      } else {
        toast.error('Failed to check in patient');
      }
    } catch (error) {
      toast.error('An error occurred while checking in patient');
      console.error('Error checking in patient:', error);
    }
  };

  const handleStartConsultation = async (appointment: AppointmentResponseDto) => {
    if (!user) return;

    const promise = async () => {
      const response = await doctorApi.startConsultation({
        appointmentId: appointment.id,
        doctorId: user.id,
        userId: user.id
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start consultation');
      }

      return response.data;
    };

    toast.promise(promise(), {
      loading: 'Preparing clinical workspace...',
      success: (data) => {
        window.location.href = `/doctor/consultations/${appointment.id}/session`;
        return 'Consultation started';
      },
      error: (err) => err.message || 'Failed to start consultation',
    });
  };

  const handleCompleteConsultation = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowCompleteConsultation(true);
  };

  const handleConsultationSuccess = () => {
    setShowCompleteConsultation(false);
    setSelectedAppointment(null);
    loadAppointments();
  };

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    aptDate.setHours(0, 0, 0, 0);

    return aptDate.getTime() === today.getTime();
  });

  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Greater than today
    return aptDate > today;
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 bg-slate-200 rounded-full mx-auto animate-pulse" />
          <p className="text-slate-400 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <ClinicalDashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700 pb-12">
        {/* Superior Header Design */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20 ring-4 ring-white">
                <CalendarDays className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  Daily Schedule
                </h1>
                <p className="text-slate-500 font-bold flex items-center gap-3 text-lg">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {format(new Date(), 'EEEE, MMMM do, yyyy')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Today</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{loading ? "-" : todayAppointments.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Check-in</p>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {loading ? "-" : todayAppointments.filter(a => a.status === AppointmentStatus.SCHEDULED).length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Tabbed Interface */}
        <Tabs defaultValue="today" className="space-y-8">
          <TabsList className="bg-white border border-slate-200 p-1 h-14 rounded-xl w-full max-w-md shadow-sm">
            <TabsTrigger value="today" className="h-12 rounded-lg text-sm font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white flex-1 transition-all">
              Today's Schedule
              <Badge className="ml-2 bg-slate-100 text-slate-900 hover:bg-slate-200 border-none px-2 h-5">
                {loading ? "-" : todayAppointments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="h-12 rounded-lg text-sm font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white flex-1 transition-all">
              Upcoming
              <Badge className="ml-2 bg-slate-100 text-slate-900 hover:bg-slate-200 border-none px-2 h-5">
                {loading ? "-" : upcomingAppointments.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 focus-visible:outline-none">
            {loading ? (
              <div className="grid gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-16 w-16 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="grid gap-6">
                {todayAppointments.map((appointment) => (
                  <DoctorAppointmentCardEnhanced
                    key={appointment.id}
                    appointment={appointment}
                    onCheckIn={handleCheckIn}
                    onStartConsultation={handleStartConsultation}
                    onCompleteConsultation={handleCompleteConsultation}
                    doctorId={user.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No appointments today</h3>
                <p className="text-slate-500 max-w-xs text-center mt-2">
                  Your schedule is clear for the day. Take a break or check upcoming appointments.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6 focus-visible:outline-none">
            {loading ? (
              <div className="grid gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-16 w-16 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="grid gap-6">
                {upcomingAppointments.map((appointment) => (
                  <DoctorAppointmentCardEnhanced
                    key={appointment.id}
                    appointment={appointment}
                    onCheckIn={handleCheckIn}
                    onStartConsultation={handleStartConsultation}
                    onCompleteConsultation={handleCompleteConsultation}
                    doctorId={user.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No upcoming appointments</h3>
                <p className="text-slate-500 max-w-xs text-center mt-2">
                  You don't have any appointments scheduled for the future.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Complete Consultation Dialog */}
        {showCompleteConsultation && selectedAppointment && (
          <CompleteConsultationDialog
            open={showCompleteConsultation}
            onClose={() => {
              setShowCompleteConsultation(false);
              setSelectedAppointment(null);
            }}
            onSuccess={handleConsultationSuccess}
            appointment={selectedAppointment}
            doctorId={user.id}
          />
        )}
      </div>
    </ClinicalDashboardShell>
  );
}
