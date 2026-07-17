'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ConsultationQueuePanel = dynamic(
  () => import('@/components/consultation/ConsultationQueuePanel').then(mod => ({
    default: mod.ConsultationQueuePanel,
  })),
  { ssr: false }
);

interface ConsultationQueueSidebarProps {
  currentAppointmentId: number | undefined;
  currentPatientName: string;
  currentAppointmentStatus: string | undefined;
  doctorId: string | undefined;
  appointments: any[];
  onSwitchPatient: (appointmentId: number) => void;
  onSaveDraft: () => Promise<void>;
  hasDrafts: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  defaultCollapsed: boolean;
}

export function ConsultationQueueSidebar({
  currentAppointmentId,
  currentPatientName,
  currentAppointmentStatus,
  doctorId,
  appointments,
  onSwitchPatient,
  onSaveDraft,
  hasDrafts,
  onRefresh,
  isRefreshing,
  defaultCollapsed,
}: ConsultationQueueSidebarProps) {
  return (
    <ConsultationQueuePanel
      currentAppointmentId={currentAppointmentId}
      currentPatientName={currentPatientName}
      currentAppointmentStatus={currentAppointmentStatus}
      doctorId={doctorId}
      appointments={appointments}
      onSwitchPatient={onSwitchPatient}
      onSaveDraft={onSaveDraft}
      hasDrafts={hasDrafts}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      defaultCollapsed={defaultCollapsed}
    />
  );
}
