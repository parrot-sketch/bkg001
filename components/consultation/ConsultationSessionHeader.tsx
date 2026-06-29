/**
 * Consultation Session Header
 * 
 * Top navigation bar for consultation session.
 * Shows patient name, timer, and session actions.
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, PanelLeft, PanelRight } from 'lucide-react';
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
  patientSidebarCollapsed?: boolean;
  onTogglePatientSidebar?: () => void;
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
   patientSidebarCollapsed,
   onTogglePatientSidebar,
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
     <header className="h-14 border-b border-slate-200/60 bg-white/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm">
       {/* Left */}
       <div className="flex items-center gap-3 min-w-0">
         <Button
           variant="ghost"
           size="icon"
           className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
           onClick={() => router.push('/doctor/consultations')}
         >
           <ArrowLeft className="h-4 w-4" />
         </Button>

         <div className="h-8 w-8 rounded-lg bg-[#e6f0f1] flex items-center justify-center text-xs font-semibold text-[#0c5d69] shrink-0">
           {initials}
         </div>

         <span className="text-sm font-semibold text-slate-900 truncate">{patientName}</span>

         <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
           active
             ? 'bg-[#e6f0f1] text-[#0c5d69]'
             : completed
             ? 'bg-emerald-50 text-emerald-700'
             : 'bg-slate-100 text-slate-600'
         }`}>
           {active ? 'Active' : completed ? 'Done' : 'Pending'}
         </span>
       </div>

       {/* Center — Timer */}
       <div className="flex items-center gap-2.5">
         <div className="text-xs text-slate-700 font-mono font-medium tabular-nums">{elapsed}</div>
         {remainingDisplay && active && (
           <span className="text-[10px] text-slate-400">
             {remainingDisplay} left
           </span>
         )}
         <AutoSaveBadge status={autoSaveStatus} />
       </div>

{/* Right — Actions */}
        <div className="flex items-center gap-2">
          {onTogglePatientSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePatientSidebar}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label={patientSidebarCollapsed ? 'Open patient panel' : 'Close patient panel'}
              title={patientSidebarCollapsed ? 'Open patient panel' : 'Close patient panel'}
            >
              {patientSidebarCollapsed ? (
                <PanelRight className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          )}
          {active && autoSaveStatus === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Retry save
            </Button>
          )}
          {active && canComplete && (
            <Button
              size="sm"
              onClick={onComplete}
              variant="outline"
              className="h-8 px-3 text-xs rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
      'text-[10px] px-1.5 py-0.5 border border-slate-200 font-semibold text-slate-700',
    )}>
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Error'}
    </span>
  );
}
