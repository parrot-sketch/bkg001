'use client';

import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentDetail } from '../../../../hooks/frontdesk/appointments/useAppointmentDetail';
import { AppointmentDetailHeader } from './components/AppointmentDetailHeader';
import { PatientInfoCard } from './components/PatientInfoCard';
import { AppointmentDetailsCard } from './components/AppointmentDetailsCard';
import { AppointmentActions } from './components/AppointmentActions';
import { AppointmentTimeline } from './components/AppointmentTimeline';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FrontdeskAppointmentDetailPage({ params }: PageProps) {
  const {
    appointment,
    isLoading,
    error,
    isCheckingIn,
    handleCheckIn,
    showCheckInButton,
    showAwaitingConfirmation,
    patientName,
    router,
    appointmentId
  } = useAppointmentDetail(params);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Appointment Not Found</h2>
        <p className="text-slate-500 mb-8 max-w-xs text-center">The clinical record or booking reference could not be retrieved.</p>
        <Button onClick={() => router.back()} variant="outline" className="rounded-xl px-8">
          Return to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 anim-fade-in">
      <AppointmentDetailHeader id={appointment.id} status={appointment.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <PatientInfoCard 
            patient={appointment.patient} 
            patientName={patientName} 
          />
          
          <AppointmentDetailsCard 
            appointmentDate={appointment.appointmentDate}
            time={appointment.time}
            type={appointment.type}
            doctorName={appointment.doctor?.name}
            note={appointment.note}
            reason={appointment.reason}
          />
        </div>

        {/* Sidebar Actions & History */}
        <div className="space-y-8">
          <AppointmentActions 
            appointmentId={appointment.id}
            patientId={appointment.patientId}
            showAwaitingConfirmation={showAwaitingConfirmation}
            showCheckInButton={showCheckInButton}
            isCheckingIn={isCheckingIn}
            onCheckIn={handleCheckIn}
          />

          <AppointmentTimeline 
            createdAt={appointment.createdAt}
            checkedInAt={appointment.checkedInAt}
            consultationStartedAt={appointment.consultationStartedAt}
            consultationEndedAt={appointment.consultationEndedAt}
          />
        </div>
      </div>
    </div>
  );
}
