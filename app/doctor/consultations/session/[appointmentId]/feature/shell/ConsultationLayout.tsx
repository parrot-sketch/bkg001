'use client';

import { ReactNode, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { PanelLeft, PanelRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VitalsData } from '@/contexts/ConsultationContext';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationSessionHeader } from '../components/Header/ConsultationSessionHeader';
import type { Role } from '@/domain/enums/Role';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

const PatientInfoSidebar = dynamic(
  () => import('@/components/consultation/PatientInfoSidebar').then(mod => ({
    default: mod.PatientInfoSidebar,
  })),
  { ssr: false }
);

const ConsultationWorkspaceOptimized = dynamic(
  () => import('@/components/consultation/ConsultationWorkspaceOptimized').then(mod => ({
    default: mod.ConsultationWorkspaceOptimized,
  })),
  {
    loading: () => <WorkspaceSkeleton />,
    ssr: false,
  }
);

const ConsultationQueuePanel = dynamic(
  () => import('@/components/consultation/ConsultationQueuePanel').then(mod => ({
    default: mod.ConsultationQueuePanel,
  })),
  { ssr: false }
);

function WorkspaceSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-14 border-b border-[#e7d6bf] bg-white flex items-center px-3 gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg bg-[#e7d6bf]/50" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-5 w-36 bg-[#e7d6bf]/50" />
        <Skeleton className="h-3 w-64 bg-[#e7d6bf]/50" />
        <Skeleton className="h-72 w-full rounded-xl bg-[#e7d6bf]/50" />
      </div>
      <div className="h-16 border-t border-[#e7d6bf] flex items-center justify-between px-6">
        <Skeleton className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50" />
        <Skeleton className="h-4 w-16 bg-[#e7d6bf]/50" />
        <Skeleton className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50" />
      </div>
    </div>
  );
}

interface ConsultationLayoutProps {
  appointment: AppointmentResponseDto;
  patient: PatientResponseDto;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  patientName: string;
  userRole: Role;
  isActive: boolean;
  isReadOnly: boolean;
  isSaving: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isPatientSidebarCollapsed: boolean;
  onTogglePatientSidebar: () => void;
  slotStartTime?: Date;
  slotDurationMinutes: number;
  waitingQueue: any[];
  isQueueRefetching: boolean;
  onSaveDraft: () => Promise<void>;
  onSwitchPatient: (appointmentId: number) => void;
  onOpenCompleteDialog: () => void;
}

export function ConsultationLayout({
  appointment,
  patient,
  vitals,
  consultation,
  doctorId,
  patientName,
  userRole,
  isActive,
  isReadOnly,
  isSaving,
  autoSaveStatus,
  isPatientSidebarCollapsed,
  onTogglePatientSidebar,
  slotStartTime,
  slotDurationMinutes,
  waitingQueue,
  isQueueRefetching,
  onSaveDraft,
  onSwitchPatient,
  onOpenCompleteDialog,
}: ConsultationLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-white text-[#2c2e4b]">
      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <ConsultationSessionHeader
          patientName={patientName}
          consultation={consultation}
          appointmentStatus={appointment?.status}
          userRole={userRole}
          onSaveDraft={onSaveDraft}
          onComplete={onOpenCompleteDialog}
          autoSaveStatus={autoSaveStatus}
          isSaving={isSaving}
          patientSidebarCollapsed={isPatientSidebarCollapsed}
          onTogglePatientSidebar={onTogglePatientSidebar}
          slotStartTime={slotStartTime}
          slotDurationMinutes={slotDurationMinutes}
        />
      </Suspense>

      {/* Main Layout — 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Info (collapsible) */}
        <div
          className={cn(
            'bg-white border-r border-[#e7d6bf] shrink-0 hidden lg:flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
            isPatientSidebarCollapsed ? 'w-14' : 'w-[280px]',
          )}
        >
          {isPatientSidebarCollapsed ? (
            <button
              type="button"
              onClick={onTogglePatientSidebar}
              className="h-full w-full flex flex-col items-center justify-center bg-[#e7d6bf]/30 hover:bg-[#e7d6bf]/50 transition-colors group"
              aria-label="Open patient panel"
              title="Open patient panel"
            >
              <PanelRight className="h-5 w-5 text-[#2c2e4b] group-hover:text-[#2c2e4b]/80 mb-1" />
              <span className="text-[10px] font-semibold text-[#2c2e4b] uppercase tracking-[0.1em]">
                Patient
              </span>
            </button>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#e7d6bf] bg-[#e7d6bf]/30">
                <span className="text-xs font-semibold text-[#2c2e4b]">Patient</span>
                <button
                  type="button"
                  onClick={onTogglePatientSidebar}
                  className="p-1 rounded hover:bg-[#e7d6bf] text-[#2c2e4b]/70 hover:text-[#2c2e4b] transition-colors"
                  aria-label="Close patient panel"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar-light">
                <PatientInfoSidebar
                  patient={patient}
                  appointment={appointment}
                  vitals={vitals}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: Workspace (flex) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fcfbf8]">
          <ConsultationWorkspaceOptimized />
        </div>

        {/* Right: Queue (260px) */}
        <ConsultationQueuePanel
          currentAppointmentId={appointment.id}
          currentPatientName={patientName}
          currentAppointmentStatus={appointment?.status}
          doctorId={doctorId || undefined}
          appointments={waitingQueue}
          onSwitchPatient={onSwitchPatient}
          onSaveDraft={onSaveDraft}
          hasDrafts={false}
          onRefresh={isQueueRefetching ? () => {} : () => {}}
          isRefreshing={isQueueRefetching}
          defaultCollapsed={false}
        />
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="h-16 bg-white border-b border-[#e7d6bf] flex items-center px-4 lg:px-6 gap-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}
