'use client';

/**
 * Consultation Queue Panel
 * 
 * A compact, collapsible panel showing patients waiting for consultation.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PatientSwitchConfirmation } from './PatientSwitchConfirmation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';

// Sub-components
import { QueueHeader } from './queue/QueueHeader';
import { QueuePatientCard } from './queue/QueuePatientCard';
import { QueueEmptyState } from './queue/QueueEmptyState';
import { QueueFooter } from './queue/QueueFooter';
import { CollapsedRail } from './queue/CollapsedRail';

interface ConsultationQueuePanelProps {
  currentAppointmentId?: number;
  currentPatientName?: string;
  appointments: AppointmentResponseDto[];
  onSwitchPatient?: (appointmentId: number) => void;
  onSaveDraft?: () => Promise<void>;
  hasDrafts?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ConsultationQueuePanel({
  currentAppointmentId,
  currentPatientName = 'Current Patient',
  appointments,
  onSwitchPatient,
  onSaveDraft,
  hasDrafts = false,
  className,
  defaultCollapsed = false,
  onRefresh,
  isRefreshing,
}: ConsultationQueuePanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [startingId, setStartingId] = useState<number | null>(null);
  
  // Confirmation modal state
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [selectedForSwitch, setSelectedForSwitch] = useState<AppointmentResponseDto | null>(null);

  const resolveDoctorId = useCallback(async () => {
    if (!user) return null;
    const doctorResponse = await doctorApi.getDoctorByUserId(user.id);
    return doctorResponse.success && doctorResponse.data ? doctorResponse.data.id : null;
  }, [user]);

  // Filter & Sort Queue
  const sortedQueue = useMemo(() => {
    return appointments
      .filter(apt =>
        apt.id !== currentAppointmentId &&
        (apt.status === AppointmentStatus.CHECKED_IN ||
          apt.status === AppointmentStatus.READY_FOR_CONSULTATION)
      )
      .sort((a, b) => {
        const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : Date.now();
        const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : Date.now();
        return timeA - timeB;
      });
  }, [appointments, currentAppointmentId]);

  const queueCount = sortedQueue.length;

  const handleInitiateSwitchClick = (apt: AppointmentResponseDto) => {
    setSelectedForSwitch(apt);
    setSwitchConfirmOpen(true);
  };

  const handleConfirmSwitch = useCallback(async () => {
    if (!selectedForSwitch || !user) {
      setSwitchConfirmOpen(false);
      return;
    }

    const apt = selectedForSwitch;
    setStartingId(apt.id);

    try {
      if (onSaveDraft) await onSaveDraft();

      const doctorId = await resolveDoctorId();
      if (!doctorId) {
        toast.error('Unable to resolve doctor profile');
        return;
      }

      const response = await doctorApi.startConsultation({
        appointmentId: apt.id,
        doctorId,
        userId: user.id
      });

      if (response.success) {
        if (onSwitchPatient) {
          onSwitchPatient(apt.id);
        } else {
          router.push(`/doctor/consultations/session/${apt.id}`);
        }
        toast.success(`Starting consultation with ${apt.patient?.firstName}`);
      } else {
        toast.error(response.error || 'Failed to start consultation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start consultation');
    } finally {
      setStartingId(null);
      setSwitchConfirmOpen(false);
      setSelectedForSwitch(null);
    }
  }, [selectedForSwitch, user, onSaveDraft, onSwitchPatient, router, resolveDoctorId]);

  if (isCollapsed) {
    return <CollapsedRail queueCount={queueCount} onClick={() => setIsCollapsed(false)} />;
  }

  return (
    <>
      <motion.div
        layoutId="queue-panel"
        initial={{ x: 260 }}
        animate={{ x: 0 }}
        exit={{ x: 260 }}
        className={cn(
          "w-72 bg-white/70 backdrop-blur-xl border-l border-slate-200 flex flex-col h-full hidden lg:flex z-30 shadow-sm relative",
          className
        )}
      >
        {queueCount > 0 && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
        )}

        <QueueHeader queueCount={queueCount} onCollapse={() => setIsCollapsed(true)} onRefresh={onRefresh} isRefreshing={isRefreshing} />

        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-2 bg-transparent">
          {queueCount === 0 ? (
            <QueueEmptyState />
          ) : (
            <div className="space-y-2 py-3">
              <AnimatePresence mode="popLayout">
                {sortedQueue.map((apt, index) => (
                  <QueuePatientCard
                    key={apt.id}
                    appointment={apt}
                    isNext={index === 0}
                    isStarting={startingId === apt.id}
                    onInitiateSwitch={handleInitiateSwitchClick}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <QueueFooter sortedQueue={sortedQueue} />
      </motion.div>

      {selectedForSwitch && (
        <PatientSwitchConfirmation
          isOpen={switchConfirmOpen}
          currentPatientName={currentPatientName}
          nextPatientName={`${selectedForSwitch.patient?.firstName} ${selectedForSwitch.patient?.lastName}`}
          hasDrafts={hasDrafts}
          onConfirm={handleConfirmSwitch}
          onCancel={() => {
            setSwitchConfirmOpen(false);
            setSelectedForSwitch(null);
          }}
        />
      )}
    </>
  );
}

// Keeping a simple wrapper if needed, but the main component now handles everything internally
export const ConsultationQueuePanelWithModal = ConsultationQueuePanel;
