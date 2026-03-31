'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';
import { useConsultationTimer } from '@/hooks/consultation/useConsultationTimer';

interface Props {
  patientName: string;
  consultation: ConsultationResponseDto | null;
  appointmentStatus?: string;
  userRole?: Role;
  onSaveDraft: () => void;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving?: boolean;
  slotStartTime?: Date;
  slotDurationMinutes?: number;
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
  slotStartTime,
  slotDurationMinutes,
}: Props) {
  const router = useRouter();

  const done = appointmentStatus === 'COMPLETED' || appointmentStatus === 'CANCELLED';
  const active = !done && consultation?.state === ConsultationState.IN_PROGRESS;
  const completed = done || consultation?.state === ConsultationState.COMPLETED;
  const canComplete = userRole === Role.DOCTOR;

  const { elapsed, timeInfo, remainingDisplay } = useConsultationTimer({
    startedAt: consultation?.startedAt,
    slotStartTime,
    slotDurationMinutes,
  });

  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-900"
          onClick={() => router.push('/doctor/consultations')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>

        <div className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          active ? 'bg-emerald-100 text-emerald-700' :
          completed ? 'bg-slate-100 text-slate-500' :
          'bg-amber-100 text-amber-700',
        )}>
          {initials}
        </div>

        <span className="text-sm font-semibold text-slate-900 truncate">{patientName}</span>

        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded',
          active ? 'bg-emerald-50 text-emerald-700' :
          completed ? 'bg-slate-100 text-slate-500' :
          'bg-amber-50 text-amber-700',
        )}>
          {active ? 'Active' : completed ? 'Done' : 'Pending'}
        </span>
      </div>

      {/* Center — Timer */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          <span className="font-mono font-medium tabular-nums">{elapsed}</span>
        </div>
        {remainingDisplay && active && (
          <span className="text-[10px] text-slate-400">
            {remainingDisplay} left
          </span>
        )}
        <AutoSaveBadge status={autoSaveStatus} />
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Save
          </Button>
        )}
        {active && canComplete && (
          <Button
            size="sm"
            onClick={onComplete}
            className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            Complete
          </Button>
        )}
      </div>
    </header>
  );
}

function AutoSaveBadge({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  return (
    <span className={cn(
      'text-[10px] px-1.5 py-0.5 rounded font-medium',
      status === 'saving' && 'text-blue-600 bg-blue-50',
      status === 'saved' && 'text-emerald-600 bg-emerald-50',
      status === 'error' && 'text-red-600 bg-red-50',
    )}>
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Error'}
    </span>
  );
}
