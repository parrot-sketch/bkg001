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
 * Route: /doctor/consultations/[appointmentId]/session
 */

import { motion, AnimatePresence } from 'framer-motion';
import { use, Suspense, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  PanelTop,
  Search,
  Users,
  Clock,
  ChevronRight,
  ChevronLeft,
  PanelRight,
  Menu,
  Loader2,
} from 'lucide-react';
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

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  // Loading state
  if (isLoading && !appointment) {
    return <LoadingState />;
  }

  // Error state
  if (state.workflow.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{state.workflow.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-500/10"
    >
      {/* ─── Header ─── */}
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
        />
      </Suspense>

      {/* ─── Main 3-Column Layout ─── */}
      <div className="flex-1 flex overflow-hidden relative border-l border-slate-200/50">
        {/* Calm light professional backgrounds */}
        <div className="absolute top-0 left-0 w-full h-full bg-slate-100/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.02] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[100px] rounded-full pointer-events-none" />

        {/* Left: Patient Sidebar */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn(
                'bg-white/80 backdrop-blur-2xl border-r border-slate-200 flex flex-col shrink-0 z-20',
                'w-[280px] h-full overflow-hidden shadow-sm',
                'hidden lg:flex',
              )}
            >
              <Suspense fallback={<SidebarSkeleton />}>
                <div className="flex-1 overflow-y-auto custom-scrollbar-light overflow-x-hidden">
                  <PatientInfoSidebar
                    patient={patient}
                    appointment={appointment}
                    consultationHistory={[]}
                    photoCount={consultation?.photoCount || 0}
                    notes={state.notes}
                    isReadOnly={isReadOnly}
                  />
                </div>
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar toggle - subtle bar */}
        <div className="hidden lg:flex items-center z-30">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.02)' }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className={cn(
              'flex items-center justify-center h-16 w-4 rounded-r-xl border border-l-0 border-slate-200',
              'bg-white/60 backdrop-blur-md text-slate-400 hover:text-indigo-600 transition-all duration-300',
              sidebarCollapsed ? 'translate-x-0' : '-translate-x-px'
            )}
            title={sidebarCollapsed ? 'Show patient info' : 'Hide patient info'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </motion.button>
        </div>

        {/* Center: Workspace */}
        <motion.div
          layout
          className="flex-1 flex flex-col min-w-0 bg-transparent z-10 h-full overflow-hidden"
        >
          <Suspense fallback={<WorkspaceSkeleton />}>
            <ConsultationWorkspaceOptimized />
          </Suspense>
        </motion.div>

        {/* Right: Queue Panel (Absolute/Overlay-like as per redesign) */}
        <Suspense fallback={null}>
          <ConsultationQueuePanel
            currentAppointmentId={appointment.id}
            appointments={waitingQueue}
            onSwitchPatient={switchToPatient}
            defaultCollapsed={true}
          />
        </Suspense>
      </div>

      {/* ─── Dialogs ─── */}
      {showStartDialog && (
        <Suspense fallback={null}>
          <StartConsultationDialog
            open={showStartDialog}
            onClose={() => {/* Handled by context */ }}
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
    </motion.div>
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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <span className="text-xl">🔗</span>
          </div>
          <p className="text-sm font-medium text-slate-600">Invalid appointment ID</p>
          <p className="text-xs text-slate-400">Please check the URL and try again</p>
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
