import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, CheckCircle2, XCircle, UserMinus, Activity, FileText, ClipboardList } from 'lucide-react';
import type { FrontdeskQueueEntry } from '@/hooks/frontdesk/use-frontdesk-dashboard';

interface QueuePatientRowProps {
  patient: FrontdeskQueueEntry;
  isNurse: boolean;
  onRecordVitals?: (patientId: string, appointmentId?: number) => void;
  onAddCareNote?: (patientId: string, appointmentId?: number) => void;
  onPreOpChecklist?: (patientId: string, appointmentId?: number) => void;
  reassignTarget?: { queueId: number; doctorId: string } | null;
  onReassignClick?: (queueId: number, doctorId: string) => void;
  onReassignConfirm?: (queueId: number, doctorId: string) => void;
  onReassignCancel?: () => void;
  onRemove?: (queueId: number) => void;
  loadingDoctors?: boolean;
  actionLoading?: string | null;
}

export function QueuePatientRow({
  patient,
  isNurse,
  onRecordVitals,
  onAddCareNote,
  onPreOpChecklist,
  reassignTarget,
  onReassignClick,
  onReassignConfirm,
  onReassignCancel,
  onRemove,
  loadingDoctors = false,
  actionLoading,
}: QueuePatientRowProps) {
  const isLoading = actionLoading === `reassign-${patient.id}` || actionLoading === `remove-${patient.id}`;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#e7d6bf]/8 rounded-lg border border-[#e7d6bf]/60">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#2c2e4b] truncate">
            {patient.patient.firstName} {patient.patient.lastName}
          </span>
          {patient.isWalkIn && (
            <Badge variant="outline" className="text-[9px] bg-[#e7d6bf]/20 text-[#2c2e4b]/70 border-[#e7d6bf] shrink-0 px-1.5 py-0 rounded-none">
              Walk-in
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-[#2c2e4b]/50 mt-0.5">
          Wait: <span className="text-[#0c5d69] font-medium">{patient.waitTime}</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge
          variant="outline"
          className={cn(
            'text-[9px] px-1.5 py-0 font-medium rounded-none',
            patient.status === 'IN_CONSULTATION'
              ? 'bg-[#caa26a]/10 text-[#9a7709] border-[#caa26a]/40'
              : 'bg-[#e7d6bf]/20 text-[#2c2e4b]/70 border-[#e7d6bf]'
          )}
        >
          {patient.status === 'IN_CONSULTATION' ? 'In progress' : 'Waiting'}
        </Badge>

        {isNurse ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRecordVitals?.(patient.patient.id, patient.appointmentId ?? undefined)}
              className="h-6 w-6 p-0 text-[#2c2e4b]/40 hover:text-[#caa26a] hover:bg-[#e7d6bf]/30 rounded-md"
              title="Record vitals"
            >
              <Activity className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddCareNote?.(patient.patient.id, patient.appointmentId ?? undefined)}
              className="h-6 w-6 p-0 text-[#2c2e4b]/40 hover:text-[#0c5d69] hover:bg-[#e7d6bf]/30 rounded-md"
              title="Add care note"
            >
              <FileText className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreOpChecklist?.(patient.patient.id, patient.appointmentId ?? undefined)}
              className="h-6 w-6 p-0 text-[#2c2e4b]/40 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
              title="Pre-op checklist"
            >
              <ClipboardList className="h-3 w-3" />
            </Button>
          </>
        ) : patient.status === 'WAITING' ? (
          <>
            {reassignTarget?.queueId === patient.id ? (
              <div className="flex items-center gap-1">
                <select
                  className="text-[10px] border border-[#e7d6bf] rounded-md px-1.5 py-1 max-w-[130px] focus:outline-none focus:ring-1 focus:ring-[#caa26a]/30 focus:border-[#caa26a] bg-white text-[#2c2e4b]"
                  value={reassignTarget.doctorId}
                  onChange={(e) => onReassignClick?.(patient.id, e.target.value)}
                  disabled={loadingDoctors}
                >
                  <option value="">{loadingDoctors ? 'Loading…' : 'Select doctor'}</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => reassignTarget.doctorId && onReassignConfirm?.(patient.id, reassignTarget.doctorId)}
                  disabled={!reassignTarget.doctorId || isLoading}
                  className="h-6 w-6 p-0 bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-md"
                >
                  {actionLoading === `reassign-${patient.id}` ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReassignCancel}
                  disabled={isLoading}
                  className="h-6 w-6 p-0 text-[#2c2e4b]/40 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-md"
                >
                  <XCircle className="h-2.5 w-2.5" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReassignClick?.(patient.id, '')}
                  className="h-6 w-6 p-0 text-[#2c2e4b]/30 hover:text-[#caa26a] hover:bg-[#e7d6bf]/30 rounded-md"
                  title="Reassign to another doctor"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove?.(patient.id)}
                  disabled={isLoading}
                  className="h-6 w-6 p-0 text-[#2c2e4b]/30 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  {actionLoading === `remove-${patient.id}` ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <UserMinus className="h-2.5 w-2.5" />
                  )}
                </Button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
