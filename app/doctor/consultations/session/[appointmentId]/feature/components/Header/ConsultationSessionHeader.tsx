'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { Role } from '@/domain/enums/Role';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

const ConsultationSessionHeaderDynamic = dynamic(
  () => import('@/components/consultation/ConsultationSessionHeader').then(mod => ({
    default: mod.ConsultationSessionHeader,
  })),
  { ssr: false }
);

interface ConsultationSessionHeaderWrapperProps {
  patientName: string;
  consultation: ConsultationResponseDto | null;
  appointmentStatus?: string;
  userRole?: Role;
  onSaveDraft: () => Promise<void>;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
  patientSidebarCollapsed: boolean;
  onTogglePatientSidebar: () => void;
  slotStartTime?: Date;
  slotDurationMinutes: number;
}

export function ConsultationSessionHeader({
  patientName,
  consultation,
  appointmentStatus,
  userRole,
  onSaveDraft,
  onComplete,
  autoSaveStatus,
  isSaving,
  patientSidebarCollapsed,
  onTogglePatientSidebar,
  slotStartTime,
  slotDurationMinutes,
}: ConsultationSessionHeaderWrapperProps) {
  return (
    <ConsultationSessionHeaderDynamic
      patientName={patientName}
      consultation={consultation}
      appointmentStatus={appointmentStatus}
      userRole={userRole}
      onSaveDraft={onSaveDraft}
      onComplete={onComplete}
      autoSaveStatus={autoSaveStatus}
      isSaving={isSaving}
      patientSidebarCollapsed={patientSidebarCollapsed}
      onTogglePatientSidebar={onTogglePatientSidebar}
      slotStartTime={slotStartTime}
      slotDurationMinutes={slotDurationMinutes}
    />
  );
}
