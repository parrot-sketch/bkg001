'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Role } from '@/domain/enums/Role';
import { useTimerContext } from '@/providers/timer/TimerContextProvider';

interface AppHeaderProps {
  patientName: string;
  appointmentStatus?: string;
  userRole?: Role;
  onSaveDraft: () => void;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving?: boolean;
  patientSidebarCollapsed?: boolean;
  queuePanelCollapsed?: boolean;
  onTogglePatientSidebar?: () => void;
  onToggleQueuePanel?: () => void;
  elapsed?: string;
  remainingDisplay?: string | null;
}

export function AppHeader({
  patientName,
  appointmentStatus,
  userRole,
  onSaveDraft,
  onComplete,
  autoSaveStatus,
  isSaving = false,
  patientSidebarCollapsed,
  queuePanelCollapsed,
  onTogglePatientSidebar,
  onToggleQueuePanel,
}: AppHeaderProps) {
  const router = useRouter();
  const { elapsed, remainingDisplay } = useTimerContext();

  const done = appointmentStatus === 'COMPLETED' || appointmentStatus === 'CANCELLED';
  const active = !done;
  const canComplete = userRole === Role.DOCTOR;

  const initials = patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 border-b border-[#e7d6bf] bg-[#2c2e4b] flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#e7d6bf] hover:text-white hover:bg-[#2c2e4b] rounded-lg transition-colors"
          onClick={() => router.push('/doctor/consultations')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="h-8 w-8 rounded-lg bg-[#caa26a] flex items-center justify-center text-xs font-bold text-white shrink-0">
          {initials}
        </div>

        <span className="text-sm font-semibold text-white truncate">{patientName}</span>
      </div>

      {/* Center — Timer */}
      <div className="flex items-center gap-2.5">
        <div className="text-xs text-[#e7d6bf] font-mono font-medium tabular-nums">{elapsed}</div>
        {remainingDisplay && active && (
          <span className="text-[10px] text-[#e7d6bf]/70">{remainingDisplay} left</span>
        )}
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {onTogglePatientSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePatientSidebar}
            className={`h-8 w-8 rounded-lg transition-colors ${
              patientSidebarCollapsed
                ? 'text-[#e7d6bf] hover:text-white hover:bg-[#1a1c2f]'
                : 'text-[#caa26a] bg-[#caa26a]/10 hover:bg-[#caa26a]/20'
            }`}
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
        {onToggleQueuePanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleQueuePanel}
            className={`h-8 w-8 rounded-lg transition-colors ${
              queuePanelCollapsed
                ? 'text-[#e7d6bf] hover:text-white hover:bg-[#1a1c2f]'
                : 'text-[#caa26a] bg-[#caa26a]/10 hover:bg-[#caa26a]/20'
            }`}
            aria-label={queuePanelCollapsed ? 'Open queue panel' : 'Close queue panel'}
            title={queuePanelCollapsed ? 'Open queue panel' : 'Close queue panel'}
          >
            {queuePanelCollapsed ? (
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
            className="h-8 px-3 text-xs text-[#e7d6bf] hover:text-white hover:bg-[#1a1c2f] rounded-lg transition-colors"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Retry save
          </Button>
        )}
        {active && canComplete && (
          <Button
            size="sm"
            onClick={onComplete}
            className="h-8 px-3 text-xs rounded-lg bg-[#caa26a] hover:bg-[#caa26a]/90 text-[#2c2e4b] font-semibold shadow-sm transition-colors"
          >
            Complete
          </Button>
        )}
      </div>
    </header>
  );
}
