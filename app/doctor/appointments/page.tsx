'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentAnalytics } from '@/components/doctor/appointments/AppointmentAnalytics';
import { AppointmentTable } from '@/components/doctor/appointments/AppointmentTable';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

const ALL_ACTIVE_STATUSES = [
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.READY_FOR_CONSULTATION,
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.PENDING,
].join(',');

export default function DoctorAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();

  const {
    data: appointmentData,
    isLoading,
    isRefetching,
    refetch,
  } = useDoctorAppointments(user?.id, ALL_ACTIVE_STATUSES, isAuthenticated && !!user);

  const appointments = useMemo(() => appointmentData || [], [appointmentData]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f4f5]">
        <p className="text-sm text-slate-400">Please log in</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Appointments</h1>
          <p className="text-sm text-white/70 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <AppointmentAnalytics appointments={appointments} isLoading={isLoading} />
      <AppointmentTable
        appointments={appointments}
        isLoading={isLoading}
        isRefreshing={isRefetching}
        onRefresh={refetch}
      />
      </section>
    </div>
  );
}
