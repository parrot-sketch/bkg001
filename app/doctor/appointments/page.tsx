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
import { Calendar, Clock, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { CompleteConsultationDialog } from '@/components/doctor/CompleteConsultationDialog';
import { DoctorAppointmentCardEnhanced } from '@/components/doctor/DoctorAppointmentCardEnhanced';

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

  const relevantAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return aptDate >= today;
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view appointments</p>
        </div>
      </div>
    );
  }

  return (
    <ClinicalDashboardShell>
      <div className="space-y-10 animate-in fade-in duration-500">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100/60 mb-2">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/10 transition-transform hover:scale-105 duration-300">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  Clinical Appointments
                </h1>
                <p className="text-slate-500 font-bold flex items-center gap-3">
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  Nairobi Sculpt • {format(new Date(), 'EEEE, MMMM d')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Today's Appointments */}
        {todayAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Appointments</CardTitle>
              <CardDescription>Appointments scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* All Appointments - Filtered for relevance */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
            <CardDescription>Your upcoming session list ({relevantAppointments.length} total)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading appointments...</p>
              </div>
            ) : relevantAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming appointments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {relevantAppointments.map((appointment) => (
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
            )}
          </CardContent>
        </Card>

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
