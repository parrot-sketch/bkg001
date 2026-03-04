'use client';

/**
 * Consultation Queue Panel
 * 
 * A compact, collapsible panel showing patients waiting for consultation.
 * Designed to be embedded in the consultation interface so doctors can
 * see the queue without leaving the current session.
 * 
 * Features:
 * - Real-time queue updates (via React Query)
 * - Compact patient cards with wait time
 * - Safe patient switching with confirmation
 * - Auto-save before switching to prevent data loss
 * - Collapsible to maximize workspace when needed
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Clock,
  Play,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PatientSwitchConfirmation } from './PatientSwitchConfirmation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';

interface ConsultationQueuePanelProps {
  /** Current appointment being consulted (to exclude from queue) */
  currentAppointmentId?: number;
  /** Current patient's full name */
  currentPatientName?: string;
  /** All today's appointments (filtered to waiting patients) */
  appointments: AppointmentResponseDto[];
  /** Callback when consultation is complete and switching to next */
  onSwitchPatient?: (appointmentId: number) => void;
  /** Callback to save draft before switch */
  onSaveDraft?: () => Promise<void>;
  /** Whether there are unsaved draft changes */
  hasDrafts?: boolean;
  /** External class for positioning */
  className?: string;
  /** Start collapsed */
  defaultCollapsed?: boolean;
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
    if (!doctorResponse.success || !doctorResponse.data?.id) {
      return null;
    }
    return doctorResponse.data.id;
  }, [user]);

  // Filter to only waiting patients (checked in but not in consultation)
  const waitingPatients = appointments.filter(apt =>
    apt.id !== currentAppointmentId &&
    (apt.status === AppointmentStatus.CHECKED_IN ||
      apt.status === AppointmentStatus.READY_FOR_CONSULTATION)
  );

  // Sort by check-in time (oldest first = longest wait)
  const sortedQueue = [...waitingPatients].sort((a, b) => {
    const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : Date.now();
    const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : Date.now();
    return timeA - timeB;
  });

  const queueCount = sortedQueue.length;
  const nextPatient = sortedQueue[0];

  // Handle starting consultation for a patient
  const handleInitiateSwitchClick = (apt: AppointmentResponseDto) => {
    // Show confirmation dialog first
    setSelectedForSwitch(apt);
    setSwitchConfirmOpen(true);
  };

  // Actually perform the switch after confirmation and save
  const handleConfirmSwitch = useCallback(async () => {
    if (!selectedForSwitch || !user) {
      setSwitchConfirmOpen(false);
      return;
    }

    const apt = selectedForSwitch;
    setStartingId(apt.id);

    try {
      // Auto-save current patient's notes if callback provided
      if (onSaveDraft) {
        await onSaveDraft();
      }

      const doctorId = await resolveDoctorId();
      if (!doctorId) {
        toast.error('Unable to resolve doctor profile');
        return;
      }

      // Start consultation with next patient
      const response = await doctorApi.startConsultation({
        appointmentId: apt.id,
        doctorId,
        userId: user.id
      });

      if (response.success) {
        // Notify parent or navigate directly
        if (onSwitchPatient) {
          onSwitchPatient(apt.id);
        } else {
          router.push(`/doctor/consultations/${apt.id}/session`);
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

  // Collapsed view - slim rail with badge
  if (isCollapsed) {
    return (
      <motion.div
        layoutId="queue-panel"
        className={cn("relative hidden lg:block z-30", className)}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            "h-full w-12 border-l border-slate-200 flex flex-col items-center justify-start pt-6 gap-3 transition-all duration-300 backdrop-blur-xl",
            queueCount > 0
              ? "bg-emerald-50 hover:bg-emerald-100"
              : "bg-white/40 hover:bg-slate-50",
          )}
        >
          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </motion.div>

          <div className="relative group">
            <Users className={cn(
              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
              queueCount > 0 ? "text-emerald-600" : "text-slate-400",
            )} />
            {queueCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[9px] h-3.5 min-w-[14px] px-1 justify-center border-none shadow-sm">
                {queueCount}
              </Badge>
            )}
          </div>

          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] [writing-mode:vertical-lr] mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
            WAITING QUEUE
          </span>
        </button>
      </motion.div>
    );
  }

  return (
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
      {/* Subtle glow for active queue */}
      {queueCount > 0 && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[13px] text-slate-900 tracking-tight">Active Queue</span>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{queueCount} Patients Waiting</span>
          </div>
        </div>
        <motion.button
          whileHover={{ x: 2, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-2 bg-transparent">
        {queueCount === 0 ? (
          <div className="py-12 px-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-16 w-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm"
            >
              <UserCheck className="h-8 w-8 text-slate-400" />
            </motion.div>
            <p className="text-sm text-slate-900 font-bold tracking-tight">Queue Clear</p>
            <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-medium">All patients attended</p>
          </div>
        ) : (
          <div className="space-y-2 py-3">
            <AnimatePresence mode="popLayout">
              {sortedQueue.map((apt, index) => {
                const patientName = apt.patient
                  ? `${apt.patient.firstName} ${apt.patient.lastName}`
                  : 'Unknown';
                const initials = patientName.substring(0, 2).toUpperCase();
                const waitTime = apt.checkedInAt
                  ? formatDistanceToNow(new Date(apt.checkedInAt), { addSuffix: false })
                  : 'Just arrived';
                const isNext = index === 0;
                const isStarting = startingId === apt.id;

                return (
                  <motion.div
                    key={apt.id}
                    layout
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={cn(
                      "p-4 rounded-2xl mx-1 transition-all duration-300 group border",
                      isNext
                        ? "bg-emerald-50 border-emerald-100 shadow-sm"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className={cn(
                          "h-10 w-10 border-2 transition-colors duration-300 shadow-sm",
                          isNext ? "border-emerald-200 bg-emerald-100" : "border-slate-100 bg-slate-50"
                        )}>
                          <AvatarFallback className={cn(
                            "text-xs font-bold",
                            isNext ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {isNext && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-bold text-[13px] truncate tracking-tight transition-colors",
                          isNext ? "text-emerald-900" : "text-slate-700"
                        )}>
                          {patientName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider font-bold",
                            isNext ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {waitTime} WAIT
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Start Button */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="sm"
                        onClick={() => handleInitiateSwitchClick(apt)}
                        disabled={startingId === apt.id}
                        className={cn(
                          "w-full mt-4 h-9 text-[11px] font-bold uppercase tracking-widest transition-all rounded-xl border-none",
                          isNext
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        )}
                      >
                        {startingId === apt.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : (
                          <Play className="h-3 w-3 mr-2" />
                        )}
                        {isNext ? 'ADMIT PATIENT' : 'BEGIN SESSION'}
                      </Button>
                    </motion.div>

                    {/* Type badge */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <Badge variant="outline" className="text-[9px] h-4.5 px-2 bg-slate-50 border-slate-100 text-slate-500 font-bold uppercase tracking-[0.1em]">
                        {apt.type || 'Consultation'}
                      </Badge>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer - Quick Stats */}
      {queueCount > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Stat</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                {getAverageWaitTime(sortedQueue)}
              </span>
              <span className="text-[9px] text-slate-400 font-medium uppercase">Avg Wait</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Confirmation modal component
export function ConsultationQueuePanelWithModal(
  props: ConsultationQueuePanelProps & {
    nextPatientName?: string;
  }
) {
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [selectedForSwitch, setSelectedForSwitch] = useState<AppointmentResponseDto | null>(null);

  const { user } = useAuth();

  const resolveDoctorId = useCallback(async () => {
    if (!user) return null;
    const doctorResponse = await doctorApi.getDoctorByUserId(user.id);
    if (!doctorResponse.success || !doctorResponse.data?.id) {
      return null;
    }
    return doctorResponse.data.id;
  }, [user]);

  const handleInitiateSwitch = (apt: AppointmentResponseDto) => {
    setSelectedForSwitch(apt);
    setSwitchConfirmOpen(true);
  };

  const handleConfirmSwitch = async () => {
    if (!selectedForSwitch || !user || !props.onSaveDraft) return;

    try {
      // Save current patient's notes
      await props.onSaveDraft();

      const doctorId = await resolveDoctorId();
      if (!doctorId) {
        toast.error('Unable to resolve doctor profile');
        return;
      }

      // Start next consultation
      const response = await doctorApi.startConsultation({
        appointmentId: selectedForSwitch.id,
        doctorId,
        userId: user.id
      });

      if (response.success) {
        if (props.onSwitchPatient) {
          props.onSwitchPatient(selectedForSwitch.id);
        } else {
          window.location.href = `/doctor/consultations/${selectedForSwitch.id}/session`;
        }
        toast.success(`Started consultation with ${selectedForSwitch.patient?.firstName}`);
      } else {
        toast.error('Failed to start consultation');
      }
    } catch (error) {
      toast.error('Error switching patients');
    } finally {
      setSwitchConfirmOpen(false);
      setSelectedForSwitch(null);
    }
  };

  return (
    <>
      <ConsultationQueuePanel {...props} />
      {selectedForSwitch && props.currentPatientName && (
        <PatientSwitchConfirmation
          isOpen={switchConfirmOpen}
          currentPatientName={props.currentPatientName}
          nextPatientName={`${selectedForSwitch.patient?.firstName} ${selectedForSwitch.patient?.lastName}`}
          hasDrafts={props.hasDrafts || false}
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

// Helper to calculate average wait time
function getAverageWaitTime(appointments: AppointmentResponseDto[]): string {
  if (appointments.length === 0) return '-';

  const now = Date.now();
  const totalMinutes = appointments.reduce((sum, apt) => {
    if (!apt.checkedInAt) return sum;
    const waitMs = now - new Date(apt.checkedInAt).getTime();
    return sum + Math.floor(waitMs / 60000);
  }, 0);

  const avgMinutes = Math.round(totalMinutes / appointments.length);

  if (avgMinutes < 1) return '< 1 min';
  if (avgMinutes === 1) return '1 min';
  return `${avgMinutes} mins`;
}
