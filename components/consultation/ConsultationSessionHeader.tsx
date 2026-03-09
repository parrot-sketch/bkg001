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
import { PatientAvatar } from './header/PatientAvatar';
import { TimerDisplay } from './header/TimerDisplay';
import { HeaderActions } from './header/HeaderActions';

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

