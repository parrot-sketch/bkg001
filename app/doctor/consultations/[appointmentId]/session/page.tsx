'use client';

/**
 * Optimized Consultation Session Page
 * 
 * Refactored with clean architecture:
 * - ConsultationProvider handles all state management
 * - Components are decoupled and lazy-loaded
 * - Clear separation of concerns
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ HEADER: Patient | Status | Actions                                  │
 * ├─────────┬───────────────────────────────────────────┬───────────────┤
 * │ PATIENT │           WORKSPACE                       │    QUEUE      │
 * │ SIDEBAR │  (Tabbed notes editor)                    │   (Optional)  │
 * └─────────┴───────────────────────────────────────────┴───────────────┘
 * 
 * Route: /doctor/consultations/[appointmentId]/session
 */

import { use, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { Role } from '@/domain/enums/Role';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const ConsultationSessionHeader = dynamic(
  () => import('@/components/consultation/ConsultationSessionHeader').then(mod => ({ 
    default: mod.ConsultationSessionHeader 
  })),
  { ssr: false }
);

const PatientInfoSidebar = dynamic(
  () => import('@/components/consultation/PatientInfoSidebar').then(mod => ({ 
    default: mod.PatientInfoSidebar 
  })),
  { ssr: false }
);

const ConsultationWorkspaceOptimized = dynamic(
  () => import('@/components/consultation/ConsultationWorkspaceOptimized').then(mod => ({ 
    default: mod.ConsultationWorkspaceOptimized 
  })),
  { 
    loading: () => <WorkspaceSkeleton />,
    ssr: false 
  }
);

const ConsultationQueuePanel = dynamic(
  () => import('@/components/consultation/ConsultationQueuePanel').then(mod => ({ 
    default: mod.ConsultationQueuePanel 
  })),
  { ssr: false }
);

const StartConsultationDialog = dynamic(
  () => import('@/components/doctor/StartConsultationDialog').then(mod => ({ 
    default: mod.StartConsultationDialog 
  })),
  { ssr: false }
);

const CompleteConsultationDialog = dynamic(
  () => import('@/components/consultation/CompleteConsultationDialog').then(mod => ({ 
    default: mod.CompleteConsultationDialog 
  })),
  { ssr: false }
);

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function HeaderSkeleton() {
  return (
    <div className="h-16 bg-white border-b flex items-center px-6 gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="w-80 border-r bg-slate-50/50 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-14 border-b bg-slate-50/50 flex items-center px-4 gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400 mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading consultation...</p>
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
    saveDraft,
    startConsultation,
    openCompleteDialog,
    closeCompleteDialog,
    completeConsultation,
    switchToPatient,
  } = useConsultationContext();
  
  const { 
    appointment, 
    patient, 
    consultation, 
    doctorId,
    isLoading,
    isSaving,
    showStartDialog,
    showCompleteDialog,
    autoSaveStatus,
  } = state;
  
  // Loading state
  if (isLoading && !appointment) {
    return <LoadingState />;
  }
  
  // Error state
  if (state.workflow.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500">{state.workflow.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  
  // Require appointment and patient
  if (!appointment || !patient) {
    return <LoadingState />;
  }
  
  const patientName = `${patient.firstName} ${patient.lastName}`;
  
  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <ConsultationSessionHeader
          patientName={patientName}
          consultation={consultation}
          userRole={Role.DOCTOR}
          onSaveDraft={saveDraft}
          onUploadPhoto={() => {/* TODO */}}
          onViewHistory={() => {/* TODO */}}
          onComplete={openCompleteDialog}
          autoSaveStatus={autoSaveStatus}
          isSaving={isSaving}
        />
      </Suspense>
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Sidebar */}
        <Suspense fallback={<SidebarSkeleton />}>
          <div className="w-80 border-r bg-white flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4">
              <PatientInfoSidebar
                patient={patient}
                appointment={appointment}
                consultationHistory={[]}
                photoCount={consultation?.photoCount || 0}
              />
            </div>
          </div>
        </Suspense>
        
        {/* Center: Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <Suspense fallback={<WorkspaceSkeleton />}>
            <ConsultationWorkspaceOptimized />
          </Suspense>
        </div>
        
        {/* Right: Queue Panel */}
        <Suspense fallback={null}>
          <ConsultationQueuePanel
            currentAppointmentId={appointment.id}
            appointments={waitingQueue}
            onSwitchPatient={switchToPatient}
            defaultCollapsed={false}
          />
        </Suspense>
      </div>
      
      {/* Dialogs */}
      {showStartDialog && (
        <Suspense fallback={null}>
          <StartConsultationDialog
            open={showStartDialog}
            onClose={() => {/* Handled by context */}}
            onSuccess={startConsultation}
            appointment={appointment}
            doctorId={doctorId || ''}
          />
        </Suspense>
      )}
      
      {showCompleteDialog && consultation && doctorId && (
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
  
  if (isNaN(appointmentId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">Invalid appointment ID</p>
      </div>
    );
  }
  
  return (
    <ConsultationProvider initialAppointmentId={appointmentId}>
      <ConsultationSessionContent />
    </ConsultationProvider>
  );
}
