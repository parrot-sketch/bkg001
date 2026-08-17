'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';
import { format } from 'date-fns';

const QUEUE_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; isPending: boolean }> = {
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Checked In', isPending: false },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Ready', isPending: false },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/30', text: 'text-[#2c2e4b]', label: 'In Consultation', isPending: false },
  WAITING: { bg: 'bg-amber-50', text: 'text-amber-800', label: 'Pending', isPending: true },
};

function extractReasonForVisit(notes: string | null): string | null {
  if (!notes) return null;
  const reasonMatch = notes.match(/Reason:\s*([^\n]+)/);
  if (reasonMatch) return reasonMatch[1].trim();
  return notes.trim() || null;
}

interface DailyQueuePanelProps {
  queue: QueuePatient[];
  isLoading?: boolean;
}

export function DailyQueuePanel({ queue, isLoading }: DailyQueuePanelProps) {
  const router = useRouter();

  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      const timeCompare = (a.time || '').localeCompare(b.time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.id - b.id;
    });
  }, [queue]);

  const handleNavigate = (appointmentId: number) => {
    router.push(`/doctor/consultations/session/${appointmentId}?start=true`);
  };

  const getActionLabel = (status: string) => {
    if (status === AppointmentStatus.IN_CONSULTATION) return 'Continue';
    if (status === 'WAITING') return 'Start';
    return null;
  };

  const isActionEnabled = (status: string) => {
    return status === AppointmentStatus.IN_CONSULTATION || status === 'WAITING';
  };

  const getStatusConfig = (status: string) => {
    return QUEUE_STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: status, isPending: false };
  };

  const pendingCount = useMemo(() => sortedQueue.filter(q => getStatusConfig(q.status).isPending).length, [sortedQueue]);

  if (isLoading) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e7d6bf]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-14 text-center shrink-0">
                  <div className="h-4 w-8 bg-[#e7d6bf]/50 animate-pulse mx-auto" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#e7d6bf]/50 animate-pulse" />
                  <div className="h-3 w-24 bg-[#e7d6bf]/50 animate-pulse" />
                </div>
                <div className="h-7 w-20 bg-[#e7d6bf]/50 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedQueue.length === 0) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Queue</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-12 text-center">
          <p className="text-sm text-[#2c2e4b]/50">No patients in queue today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Queue</CardTitle>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
                {pendingCount} pending
              </span>
            )}
            <span className="text-xs text-[#2c2e4b]/60 font-medium">
              {sortedQueue.length} patient{sortedQueue.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {sortedQueue.map((queueItem, index) => {
            const status = queueItem.status;
            const statusConfig = getStatusConfig(status);
            const actionLabel = getActionLabel(status);
            const actionEnabled = isActionEnabled(status);
            const patientName = queueItem.patient
              ? `${queueItem.patient.firstName} ${queueItem.patient.lastName}`
              : 'Unknown Patient';

            return (
              <div
                key={queueItem.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 transition-colors',
                  statusConfig.isPending
                    ? 'bg-amber-50/60 hover:bg-amber-100/60 cursor-pointer'
                    : 'hover:bg-[#e7d6bf]/20 cursor-pointer'
                )}
                onClick={() => {
                  if (actionEnabled && queueItem.appointmentId) handleNavigate(queueItem.appointmentId!);
                }}
              >
                <div className="w-14 text-center shrink-0">
                  <p className="text-sm font-semibold text-[#2c2e4b] leading-none tabular-nums">
                    {queueItem.time || '--:--'}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2c2e4b] truncate">{patientName}</p>
                    {queueItem.patient?.fileNumber && (
                      <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">
                        #{queueItem.patient.fileNumber}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const reason = extractReasonForVisit(queueItem.notes);
                    return reason ? (
                      <p className="text-xs text-[#2c2e4b]/70 truncate mt-1">
                        <span className="font-medium text-[#caa26a]">Reason:</span> {reason}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#2c2e4b]/60 truncate">{queueItem.type || 'Consultation'}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn('text-[10px] font-medium border border-[#e7d6bf]', statusConfig.bg, statusConfig.text)}>
                    {statusConfig.label}
                  </Badge>
                  {actionLabel && queueItem.appointmentId && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(queueItem.appointmentId!);
                      }}
                      className={cn(
                        'h-8 px-3 text-xs shadow-sm',
                        status === AppointmentStatus.IN_CONSULTATION
                          ? 'bg-violet-600 hover:bg-violet-700 text-white'
                          : 'bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white'
                      )}
                    >
                      {actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
