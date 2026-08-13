'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { AppointmentStatus, canStartConsultation } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

function extractReasonForVisit(notes: string | null): string | null {
  if (!notes) return null;
  const reasonMatch = notes.match(/Reason:\s*([^\n]+)/);
  if (reasonMatch) return reasonMatch[1].trim();
  return notes.trim() || null;
}

interface QueuePanelProps {
  queue: QueuePatient[];
  onRefresh: () => void;
  onLoadPatient: (appointmentId: number) => void;
  isRefetching: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Checked In' },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Ready' },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/30', text: 'text-[#2c2e4b]', label: 'In Consultation' },
};

export function QueuePanel({ queue, onRefresh, onLoadPatient, isRefetching }: QueuePanelProps) {
  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      const timeCompare = (a.time || '').localeCompare(b.time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.id - b.id;
    });
  }, [queue]);

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
          onClick={onRefresh}
          disabled={isRefetching}
          className="h-7 w-7 text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/40"
        >
          {isRefetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        {sortedQueue.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#caa26a]/10 mb-3">
              <Users className="h-5 w-5 text-[#caa26a]/80" />
            </div>
            <p className="text-xs font-medium text-[#2c2e4b]">No patients in queue</p>
            <p className="text-[10px] text-[#2c2e4b]/50 mt-1">Checked-in patients will appear here</p>
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {sortedQueue.map((queueItem) => {
              const statusConfig = STATUS_CONFIG[queueItem.status] ?? STATUS_CONFIG[AppointmentStatus.CHECKED_IN];
              const patientName = queueItem.patient
                ? `${queueItem.patient.firstName} ${queueItem.patient.lastName}`
                : 'Unknown Patient';
              const canLoad = queueItem.status === AppointmentStatus.IN_CONSULTATION || queueItem.status === 'WAITING';
              const reason = extractReasonForVisit(queueItem.notes);

              return (
                <div
                  key={queueItem.id}
                  className={cn(
                    'group relative rounded-xl border border-[#e7d6bf] bg-white p-3.5 transition-all duration-200',
                    canLoad
                      ? 'hover:border-[#caa26a]/50 hover:shadow-md hover:shadow-[#caa26a]/5 cursor-pointer'
                      : 'opacity-75'
                  )}
                >
                  <div className={cn('absolute left-0 top-3 bottom-3 w-1 rounded-r-full', statusConfig.bg.replace('/20', '').replace('/30', '').replace('bg-', 'bg-'))} />
                  <div className="flex items-start justify-between gap-2 mb-2 pl-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2c2e4b] truncate">{patientName}</p>
                      <p className="text-[10px] text-[#2c2e4b]/50 font-mono">
                        #{queueItem.patient?.fileNumber || '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] font-medium border-0 shrink-0 px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.text)}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {reason && (
                    <div className="pl-2 mb-2">
                      <p className="text-[10px] text-[#2c2e4b]/70 line-clamp-2">
                        <span className="font-medium text-[#caa26a]">Reason:</span> {reason}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pl-2">
                    <span className="text-[10px] text-[#2c2e4b]/60 font-mono">
                      {queueItem.time || '--:--'}
                    </span>
                    {canLoad && queueItem.appointmentId && (
                      <Button
                        size="sm"
                        onClick={() => onLoadPatient(queueItem.appointmentId as number)}
                        className="h-7 px-3 text-[10px] rounded-md bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white shadow-sm transition-colors"
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
