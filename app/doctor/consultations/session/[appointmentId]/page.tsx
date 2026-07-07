'use client';


import { use, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/patient/useAuth';
import Link from 'next/link';
import { Loader2, PanelLeft, PanelRight } from 'lucide-react';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';

// ============================================================================
// BRAND TOKENS
// ============================================================================

const BRAND = {
  primary: '#2c2e4b',
  primaryLight: '#e7d6bf',
  primaryDark: '#1a1c2f',
  accent: '#caa26a',
  border: 'border-[#e7d6bf]',
  borderStrong: 'border-[#caa26a]/40',
};

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

function SidebarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl bg-[#e7d6bf]/50" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-28 bg-[#e7d6bf]/50" />
          <Skeleton className="h-3 w-20 bg-[#e7d6bf]/50" />
        </div>
      </div>
      <div className="border-t border-[#e7d6bf] pt-3 space-y-3">
        <Skeleton className="h-3 w-16 bg-[#e7d6bf]/50" />
        <Skeleton className="h-10 w-full rounded-lg bg-[#e7d6bf]/50" />
      </div>
      <div className="border-t border-[#e7d6bf] pt-3 space-y-3">
        <Skeleton className="h-3 w-20 bg-[#e7d6bf]/50" />
        <Skeleton className="h-16 w-full rounded-lg bg-[#e7d6bf]/50" />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Tab bar skeleton */}
      <div className="h-14 border-b border-[#e7d6bf] bg-white flex items-center px-3 gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg bg-[#e7d6bf]/50" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-5 w-36 bg-[#e7d6bf]/50" />
        <Skeleton className="h-3 w-64 bg-[#e7d6bf]/50" />
        <Skeleton className="h-72 w-full rounded-xl bg-[#e7d6bf]/50" />
      </div>
      {/* Footer skeleton */}
      <div className="h-16 border-t border-[#e7d6bf] flex items-center justify-between px-6">
        <Skeleton className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50" />
        <Skeleton className="h-4 w-16 bg-[#e7d6bf]/50" />
        <Skeleton className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-white border border-[#e7d6bf] flex items-center justify-center mx-auto">
            <Loader2 className="h-7 w-7 animate-spin text-[#caa26a]" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-[#2c2e4b]">Loading Consultation Room…</p>
          <p className="text-xs text-[#2c2e4b]/60 mt-1">Preparing your workspace</p>
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
      {/* Simple header with brand accent */}
      <div className="h-16 border-b border-[#e7d6bf] flex items-center justify-center px-4 bg-white">
        <h1 className="text-base font-semibold text-[#2c2e4b]">Consultation room</h1>
      </div>

      {/* Main content area - centered message */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm border border-[#e7d6bf] bg-white p-8 rounded-xl shadow-sm">
          <h2 className="text-base font-semibold text-[#2c2e4b] mb-2">Waiting for patient</h2>
          <p className="text-sm text-[#2c2e4b]/70 mb-4">
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
    loadWaitingQueue,
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

  useEffect(() => {
    if (appointment) {
      loadWaitingQueue();
    }
  }, [appointment, loadWaitingQueue]);

  // Loading state
  if (isLoading && !appointment) {
    return <LoadingState />;
  }

  // Error state
  if (state.workflow.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="border border-[#e7d6bf] bg-white p-6">
            <h2 className="text-base font-semibold text-[#2c2e4b]">Unable to load consultation</h2>
          <p className="text-sm text-[#2c2e4b]/70 leading-relaxed">{state.workflow.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
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
            doctorId={doctorId || undefined}
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
    <div className="flex flex-col h-screen bg-white text-[#2c2e4b]">
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
        {/* Left: Patient Info (collapsible) - brand themed */}
        <div
          className={cn(
            'bg-white border-r border-[#e7d6bf] shrink-0 hidden lg:flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
            isPatientSidebarCollapsed ? 'w-14' : 'w-[280px]',
          )}
        >
          {isPatientSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsPatientSidebarCollapsed(false)}
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
              {/* Panel header with close button */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#e7d6bf] bg-[#e7d6bf]/30">
                <span className="text-xs font-semibold text-[#2c2e4b]">Patient</span>
                <button
                  type="button"
                  onClick={() => setIsPatientSidebarCollapsed(true)}
                  className="p-1 rounded hover:bg-[#e7d6bf] text-[#2c2e4b]/70 hover:text-[#2c2e4b] transition-colors"
                  aria-label="Close patient panel"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </div>
              {/* Independent scroll container */}
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
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center p-8 bg-white border border-[#e7d6bf] max-w-md">
          <h2 className="text-base font-semibold text-[#2c2e4b] mb-2">Authentication required</h2>
          <p className="text-sm text-[#2c2e4b]/70 mb-6">Please log in to access the consultation room.</p>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-lg border-[#e7d6bf] text-[#2c2e4b]">Return to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isNaN(appointmentId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3 border border-[#e7d6bf] bg-white p-6 max-w-md">
          <p className="text-sm font-semibold text-[#2c2e4b]">Invalid appointment ID</p>
          <p className="text-xs text-[#2c2e4b]/60">Please check the URL and try again.</p>
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
