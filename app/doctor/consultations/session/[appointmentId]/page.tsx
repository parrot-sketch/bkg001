'use client';

/**
 * Consultation Session Page
 * 
 * Premium clinical workstation layout — responsive and balanced.
 * 
 * Desktop (≥1024px):
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                          HEADER                                      │
 * ├──────────┬──────────────────────────────────────────┬────────────────┤
 * │ PATIENT  │              WORKSPACE                   │    QUEUE       │
 * │ SIDEBAR  │  (Step-based notes editor)               │  (Collapsible) │
 * │  280px   │                                          │    260px       │
 * └──────────┴──────────────────────────────────────────┴────────────────┘
 * 
 * Tablet (768–1023px):
 * Sidebar collapses, queue hidden by default.
 * 
 * Mobile (<768px):
 * Full-width workspace only. Sidebar & queue as overlays.
 * 
 * Route: /doctor/consultations/session/[appointmentId]
 */

import { use, Suspense, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/patient/useAuth';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const ConsultationSessionHeader = dynamic(
  () => import('@/components/consultation/ConsultationSessionHeader').then(mod => ({
    default: mod.ConsultationSessionHeader,
  })),
  { ssr: false }
);

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

const StartConsultationDialog = dynamic(
  () => import('@/components/doctor/StartConsultationDialog').then(mod => ({
    default: mod.StartConsultationDialog,
  })),
  { ssr: false }
);

const CompleteConsultationDialog = dynamic(
  () => import('@/components/consultation/CompleteConsultationDialog').then(mod => ({
    default: mod.CompleteConsultationDialog,
  })),
  { ssr: false }
);

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function HeaderSkeleton() {
  return (
    <div className="h-16 bg-white border-b flex items-center px-4 lg:px-6 gap-3">
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

function SidebarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Tab bar skeleton */}
      <div className="h-14 border-b bg-slate-50/80 flex items-center px-3 gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      {/* Footer skeleton */}
      <div className="h-16 border-t flex items-center justify-between px-6">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Loading Consultation Room…</p>
          <p className="text-xs text-slate-400 mt-1">Preparing your workspace</p>
        </div>
      </div>
    </div>
  );
}

function NoPatientState({ waitingQueue, onRefresh, isRefreshing }: { 
  waitingQueue: any[]; 
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Simple header */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-center px-4">
        <h1 className="text-base font-semibold text-slate-900">Consultation room</h1>
      </div>

      {/* Main content area - centered message */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Waiting for patient</h2>
          <p className="text-sm text-slate-600 mb-4">
            {waitingQueue.length > 0 
              ? `${waitingQueue.length} patient${waitingQueue.length > 1 ? 's' : ''} waiting in queue`
              : 'No patients currently in queue'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONTENT (Uses Context)
// ============================================================================

function ConsultationSessionContent() {
  const {
    state,
    isActive,
    isReadOnly,
    waitingQueue,
    refetchQueue,
    isQueueRefetching,
    saveDraft,
    startConsultation,
    closeStartDialog,
    openCompleteDialog,
    closeCompleteDialog,
    completeConsultation,
    switchToPatient,
  } = useConsultationContext();

  const [isPatientSidebarCollapsed, setIsPatientSidebarCollapsed] = useState(true);

  const {
    appointment,
    patient,
    vitals,
    consultation,
    doctorId,
    isLoading,
    isSaving,
    showStartDialog,
    showCompleteDialog,
    autoSaveStatus,
  } = state;

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';

  // Loading state
  if (isLoading && !appointment) {
    return <LoadingState />;
  }

  // Error state
  if (state.workflow.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Unable to load consultation</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{state.workflow.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-none"
          >
            Try again
          </Button>
          </div>
        </div>
      </div>
    );
  }

  // Require appointment and patient - show queue state if no patient
  if (!appointment || !patient) {
    return (
      <div className="flex h-screen">
        <div className="flex-1">
          <NoPatientState 
            waitingQueue={waitingQueue} 
            onRefresh={refetchQueue}
            isRefreshing={isQueueRefetching}
          />
        </div>
        {/* Queue Panel */}
        <Suspense fallback={null}>
          <ConsultationQueuePanel
            currentAppointmentId={appointment?.id}
            currentPatientName={patientName}
            currentAppointmentStatus={appointment?.status}
            appointments={waitingQueue}
            onSwitchPatient={switchToPatient}
            onSaveDraft={saveDraft}
            hasDrafts={state.workflow.isDirty}
            onRefresh={refetchQueue}
            isRefreshing={isQueueRefetching}
            defaultCollapsed={false}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900">
      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <ConsultationSessionHeader
          patientName={patientName}
          consultation={consultation}
          appointmentStatus={appointment?.status}
          userRole={Role.DOCTOR}
          onSaveDraft={saveDraft}
          onComplete={openCompleteDialog}
          autoSaveStatus={autoSaveStatus}
          isSaving={isSaving}
          patientSidebarCollapsed={isPatientSidebarCollapsed}
          onTogglePatientSidebar={() => setIsPatientSidebarCollapsed(v => !v)}
          slotStartTime={
            appointment?.appointmentDate && appointment?.time
              ? new Date(`${new Date(appointment.appointmentDate).toISOString().split('T')[0]}T${appointment.time}`)
              : undefined
          }
          slotDurationMinutes={appointment?.consultationDuration || 30}
        />
      </Suspense>

      {/* Main Layout — 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Info (collapsible) */}
        <div
          className={cn(
            'bg-white border-r border-slate-200 shrink-0 hidden lg:flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
            isPatientSidebarCollapsed ? 'w-9' : 'w-[280px]',
          )}
        >
          {isPatientSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsPatientSidebarCollapsed(false)}
              className="h-full w-full flex items-center justify-center text-[10px] font-semibold text-slate-500 hover:text-slate-900"
              aria-label="Open patient panel"
              title="Patient"
            >
              <span className="[writing-mode:vertical-rl] uppercase tracking-[0.2em]">Patient</span>
            </button>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Patient</span>
                <button
                  type="button"
                  onClick={() => setIsPatientSidebarCollapsed(true)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Hide
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
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
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
          <ConsultationWorkspaceOptimized />
        </div>

        {/* Right: Queue (260px) */}
        <ConsultationQueuePanel
          currentAppointmentId={appointment.id}
          currentPatientName={patientName}
          appointments={waitingQueue}
          onSwitchPatient={switchToPatient}
          onSaveDraft={saveDraft}
          hasDrafts={state.workflow.isDirty}
          onRefresh={refetchQueue}
          isRefreshing={isQueueRefetching}
          defaultCollapsed={false}
        />
      </div>

      {/* Dialogs */}
      {showStartDialog && appointment && (
        <Suspense fallback={null}>
          <StartConsultationDialog
            open={showStartDialog}
            onClose={closeStartDialog}
            onSuccess={startConsultation}
            appointment={appointment}
            doctorId={doctorId || ''}
          />
        </Suspense>
      )}

      {showCompleteDialog && consultation && appointment && doctorId && (
        <Suspense fallback={null}>
          <CompleteConsultationDialog
            open={showCompleteDialog}
            onClose={closeCompleteDialog}
            onSuccess={completeConsultation}
            consultation={consultation}
            appointment={appointment}
            doctorId={doctorId}
          />
        </Suspense>
      )}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export default function ConsultationSessionPageOptimized({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = parseInt(resolvedParams.appointmentId, 10);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white border border-slate-200 max-w-md">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Authentication required</h2>
          <p className="text-sm text-slate-600 mb-6">Please log in to access the consultation room.</p>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-none">Return to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isNaN(appointmentId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3 border border-slate-200 bg-white p-6 max-w-md">
          <p className="text-sm font-semibold text-slate-900">Invalid appointment ID</p>
          <p className="text-xs text-slate-500">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <ConsultationProvider initialAppointmentId={appointmentId}>
      <ConsultationSessionContent />
    </ConsultationProvider>
  );
}
