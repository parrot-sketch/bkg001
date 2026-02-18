'use client';

/**
 * Consultation Session Header
 * 
 * Premium clinical workstation header:
 * - Patient identity with avatar
 * - Live consultation timer
 * - Status badge (Active / Completed / Not Started)
 * - Auto-save indicator
 * - Quick actions (Save, Complete)
 * 
 * Design: Glass-morphism header with subtle depth, clean typography.
 */

import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Save,
  CheckCircle2,
  ArrowLeft,
  Activity,
  Circle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';

interface ConsultationSessionHeaderProps {
  patientName: string;
  consultation: ConsultationResponseDto | null;
  appointmentStatus?: string;
  userRole?: Role;
  onSaveDraft: () => void;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving?: boolean;
}

export function ConsultationSessionHeader({
  patientName,
  consultation,
  appointmentStatus,
  userRole,
  onSaveDraft,
  onComplete,
  autoSaveStatus,
  isSaving = false,
}: ConsultationSessionHeaderProps) {
  const router = useRouter();
  // Ground truth: appointment status takes precedence over consultation record state.
  // Old consultations completed before our updates may have stale consultation state.
  const appointmentDone = appointmentStatus === 'COMPLETED' || appointmentStatus === 'CANCELLED';
  const isActive = !appointmentDone && consultation?.state === ConsultationState.IN_PROGRESS;
  const isCompleted = appointmentDone || consultation?.state === ConsultationState.COMPLETED;
  const startedAt = consultation?.startedAt;
  const canCompleteConsultation = userRole === Role.DOCTOR;

  // Live timer
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Formatted elapsed time
  const elapsed = useMemo(() => {
    if (!startedAt) return null;
    const diff = now.getTime() - new Date(startedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [startedAt, now]);

  // Patient initials
  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16 w-full">
        {/* Left: Back + Patient Identity */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Back button */}
          <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => router.push('/doctor/consultations')}
              title="Back to Consultation Room"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Patient identity container */}
          <div className="flex items-center gap-3 min-w-0 group cursor-default">
            {/* Patient avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm transition-all duration-300',
                isActive
                  ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                  : isCompleted
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
              )}
            >
              {initials}
            </motion.div>

            {/* Patient name & status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[15px] font-bold text-slate-900 tracking-tight transition-colors">
                  {patientName}
                </h1>
                <StatusBadge
                  isActive={isActive}
                  isCompleted={isCompleted}
                />
              </div>
              {/* Timer row */}
              <div className="flex items-center gap-3 mt-0.5">
                {elapsed && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium"
                  >
                    <Clock className="h-3 w-3 text-emerald-500/70" />
                    <span className="font-mono tabular-nums tracking-wider">{elapsed}</span>
                  </motion.div>
                )}
                <AutoSaveIndicator status={autoSaveStatus} isSaving={isSaving} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {isActive && (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveDraft}
                  disabled={isSaving}
                  className="h-9 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600 font-medium shadow-sm transition-all"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  ) : (
                    <Save className="h-3.5 w-3.5 opacity-70" />
                  )}
                  <span className="hidden sm:inline">Save Draft</span>
                </Button>
              </motion.div>

              {canCompleteConsultation && (
                <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={onComplete}
                    size="sm"
                    className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 shadow-sm transition-all border-none"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Complete Session</span>
                  </Button>
                </motion.div>
              )}
            </>
          )}
          {isCompleted && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-600 border-emerald-100 gap-1.5 py-1.5 px-3 font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              CONCLUDED
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({
  isActive,
  isCompleted,
}: {
  isActive: boolean;
  isCompleted: boolean;
}) {
  if (isActive) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200/80 gap-1 text-[11px] font-medium px-2 py-0 h-5"
      >
        <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
        In Progress
      </Badge>
    );
  }

  if (isCompleted) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-500 border-slate-200 gap-1 text-[11px] font-medium px-2 py-0 h-5"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        Completed
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px] font-medium px-2 py-0 h-5"
    >
      <Activity className="h-2.5 w-2.5" />
      Not Started
    </Badge>
  );
}

// ============================================================================
// AUTO-SAVE INDICATOR
// ============================================================================

function AutoSaveIndicator({
  status,
  isSaving,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
}) {
  if (status === 'saving' || isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-blue-600">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>All changes saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span>Save failed — retry</span>
      </div>
    );
  }

  return null;
}
