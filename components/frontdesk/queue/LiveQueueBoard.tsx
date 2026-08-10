import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FrontdeskQueueEntry } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { QueuePatientRow } from './QueuePatientRow';

interface LiveQueueBoardProps {
  title?: string;
  loading: boolean;
  error: Error | null;
  queue: { doctorId: string; doctorName: string; patients: FrontdeskQueueEntry[] }[];
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

export function LiveQueueBoard({
  title,
  loading,
  error,
  queue,
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
}: LiveQueueBoardProps) {
  const totalInQueue = queue.reduce((sum, g) => sum + g.patients.length, 0);
  const hasLiveQueue = queue.length > 0;

  const displayTitle = title ?? (isNurse ? 'Patient Queue' : 'Live Queue');

  return (
    <Card className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
            <Users className="h-4 w-4 text-[#caa26a]" />
          </div>
          {displayTitle}
        </div>
        <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
          {totalInQueue}
        </Badge>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
          </div>
        ) : error ? (
          <div className="p-3 text-center">
            <p className="text-xs text-[#2c2e4b]/60">
              Unable to load.{' '}
              <button onClick={() => window.location.reload()} className="text-[#0c5d69] underline hover:no-underline">
                Retry
              </button>
            </p>
          </div>
        ) : !hasLiveQueue ? (
          <div className="px-4 py-6 text-center text-xs text-[#2c2e4b]/40">
            No patients in queue
          </div>
        ) : (
          <div className="divide-y divide-[#e7d6bf]/60">
            {queue.map((doctorGroup) => (
              <div key={doctorGroup.doctorId} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#2c2e4b] uppercase tracking-wide">
                    {doctorGroup.doctorName}
                  </p>
                  <span className="text-[10px] text-[#2c2e4b]/40">
                    {doctorGroup.patients.filter(p => p.status === 'WAITING').length} waiting · {doctorGroup.patients.filter(p => p.status === 'IN_CONSULTATION').length} in progress
                  </span>
                </div>
                <div className="space-y-1.5">
                  {doctorGroup.patients.map((patient) => (
                    <QueuePatientRow
                      key={patient.id}
                      patient={patient}
                      isNurse={isNurse}
                      onRecordVitals={onRecordVitals}
                      onAddCareNote={onAddCareNote}
                      onPreOpChecklist={onPreOpChecklist}
                      reassignTarget={reassignTarget}
                      onReassignClick={onReassignClick}
                      onReassignConfirm={onReassignConfirm}
                      onReassignCancel={onReassignCancel}
                      onRemove={onRemove}
                      loadingDoctors={loadingDoctors}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
