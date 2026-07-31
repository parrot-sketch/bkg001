'use client';

import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useQueueContext } from '@/providers/queue/QueueContextProvider';
import { useSessionContext } from '@/providers/session/SessionProvider';
import { AppointmentStatus, canStartConsultation } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Checked In' },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Ready' },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/30', text: 'text-[#2c2e4b]', label: 'In Consultation' },
};

export function PatientQueuePanel() {
  const { waitingQueue, refetchQueue, isQueueRefetching, loadWaitingQueue } = useQueueContext();
  const { switchToPatient, appointment } = useSessionContext();

  useEffect(() => {
    loadWaitingQueue();
  }, [loadWaitingQueue]);

  const sortedQueue = useMemo(() => {
    return [...waitingQueue].sort((a, b) => {
      const timeCompare = (a.time || '').localeCompare(b.time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.id - b.id;
    });
  }, [waitingQueue]);

  const handleLoadPatient = async (targetAppointmentId: number) => {
    if (!appointment) return;
    try {
      await switchToPatient(targetAppointmentId);
    } catch (err: any) {
      console.error('Failed to load next patient:', err);
      toast.error(err?.message || 'Failed to switch patient');
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchQueue();
    } catch (err) {
      console.error('Failed to refresh queue:', err);
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="h-full flex flex-col border-l border-[#e7d6bf] bg-white">
      <div className="shrink-0 px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#caa26a]" />
          <h3 className="text-xs font-semibold text-[#2c2e4b] uppercase tracking-wider">Live Queue</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isQueueRefetching}
          className="h-7 w-7 text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/40"
        >
          {isQueueRefetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        {sortedQueue.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-[#2c2e4b]/50">No patients in queue</p>
            <p className="text-[10px] text-[#2c2e4b]/40 mt-1">Checked-in patients will appear here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sortedQueue.map((queueItem) => {
              const statusConfig = STATUS_CONFIG[queueItem.status] ?? STATUS_CONFIG[AppointmentStatus.CHECKED_IN];
              const patientName = queueItem.patient
                ? `${queueItem.patient.firstName} ${queueItem.patient.lastName}`
                : 'Unknown Patient';
              const canLoad = queueItem.status === AppointmentStatus.IN_CONSULTATION || queueItem.status === 'WAITING';

              return (
                <div
                  key={queueItem.id}
                  className={cn(
                    'rounded-lg border border-[#e7d6bf] bg-white p-3 transition-colors',
                    canLoad && 'hover:border-[#caa26a]/50 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#2c2e4b] truncate">{patientName}</p>
                      <p className="text-[10px] text-[#2c2e4b]/50 font-mono">
                        #{queueItem.patient?.fileNumber || '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] font-medium border-0 shrink-0', statusConfig.bg, statusConfig.text)}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#2c2e4b]/60">
                      {queueItem.time || '--:--'}
                    </span>
                     {canLoad && queueItem.appointmentId && (
                        <Button
                          size="sm"
                          onClick={() => handleLoadPatient(queueItem.appointmentId as number)}
                          className="h-7 px-2.5 text-[10px] rounded-md bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                        >
                          Load
                        </Button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
