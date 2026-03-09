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
 */

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Save,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';
import { useConsultationTimer } from '@/hooks/consultation/useConsultationTimer';
import { StatusBadge } from './ui/StatusBadge';
import { AutoSaveIndicator } from './ui/AutoSaveIndicator';

interface ConsultationSessionHeaderProps {
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
}: ConsultationSessionHeaderProps) {
  const router = useRouter();
  
  const appointmentDone = appointmentStatus === 'COMPLETED' || appointmentStatus === 'CANCELLED';
  const isActive = !appointmentDone && consultation?.state === ConsultationState.IN_PROGRESS;
  const isCompleted = appointmentDone || consultation?.state === ConsultationState.COMPLETED;
  const canCompleteConsultation = userRole === Role.DOCTOR;

  const { elapsed, timeInfo, remainingDisplay } = useConsultationTimer({
    startedAt: consultation?.startedAt,
    slotStartTime,
    slotDurationMinutes,
  });

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
            <PatientAvatar initials={initials} isActive={isActive} isCompleted={isCompleted} />
            
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[15px] font-bold text-slate-900 tracking-tight transition-colors">
                  {patientName}
                </h1>
                <StatusBadge isActive={isActive} isCompleted={isCompleted} />
              </div>
              
              <div className="flex items-center gap-3 mt-0.5">
                <TimerDisplay 
                  elapsed={elapsed} 
                  timeInfo={timeInfo} 
                  remainingDisplay={remainingDisplay} 
                />
                <AutoSaveIndicator status={autoSaveStatus} isSaving={isSaving} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <HeaderActions 
            isActive={isActive} 
            isCompleted={isCompleted}
            isSaving={isSaving}
            canComplete={canCompleteConsultation}
            onSave={onSaveDraft}
            onComplete={onComplete}
          />
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PatientAvatar({ initials, isActive, isCompleted }: { 
  initials: string; 
  isActive: boolean; 
  isCompleted: boolean; 
}) {
  return (
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
  );
}

function TimerDisplay({ elapsed, timeInfo, remainingDisplay }: {
  elapsed: string | null;
  timeInfo: any;
  remainingDisplay: string | null;
}) {
  if (!elapsed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium"
    >
      <Clock className="h-3 w-3 text-emerald-500/70" />
      <span className="font-mono tabular-nums tracking-wider">{elapsed}</span>
      
      {timeInfo && (
        <>
          {' • '}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-md font-mono tabular-nums',
              timeInfo.isOverrun
                ? 'bg-red-50 text-red-600 font-bold'
                : timeInfo.isWarning
                  ? 'bg-amber-50 text-amber-600 font-bold'
                  : 'text-slate-500'
            )}
          >
            {remainingDisplay}
          </div>
          
          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, timeInfo.percentUsed)}%`,
              }}
              className={cn(
                'h-full transition-colors',
                timeInfo.isOverrun ? 'bg-red-500' : timeInfo.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}

function HeaderActions({ isActive, isCompleted, isSaving, canComplete, onSave, onComplete }: {
  isActive: boolean;
  isCompleted: boolean;
  isSaving: boolean;
  canComplete: boolean;
  onSave: () => void;
  onComplete: () => void;
}) {
  if (isCompleted) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-600 border-emerald-100 gap-1.5 py-1.5 px-3 font-bold"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        CONCLUDED
      </Badge>
    );
  }

  if (!isActive) return null;

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
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

      {canComplete && (
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
  );
}
