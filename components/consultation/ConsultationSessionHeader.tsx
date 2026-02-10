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
    <header className="border-b bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left: Back + Patient Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-slate-400 hover:text-slate-700"
            onClick={() => router.push('/doctor/consultations')}
            title="Back to Consultation Room"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Patient avatar */}
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm',
            isActive
              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20'
              : isCompleted
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-100 text-blue-700'
          )}>
            {initials}
          </div>

          {/* Patient name & status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-semibold text-slate-900 truncate">
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
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono tabular-nums">{elapsed}</span>
                </div>
              )}
              <AutoSaveIndicator status={autoSaveStatus} isSaving={isSaving} />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="h-9 gap-1.5 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
              {canCompleteConsultation && (
                <Button
                  onClick={onComplete}
                  size="sm"
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Complete</span>
                </Button>
              )}
            </>
          )}
          {isCompleted && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
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
