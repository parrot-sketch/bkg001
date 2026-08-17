'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

interface QueuePatientsViewProps {
  queue: QueuePatient[];
  isLoading: boolean;
  total: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onOpenPatient: (appointmentId: number, status: string) => void;
  onNewConsultation: (patientId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function QueuePatientsView({
  queue,
  isLoading,
  total,
  totalPages,
  currentPage,
  onPageChange,
  onOpenPatient,
  onNewConsultation,
  selectedDate,
  onDateChange,
}: QueuePatientsViewProps) {
  const today = new Date().toISOString().split('T')[0];

  const applyQuickFilter = (filter: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    if (filter === 'today') {
      onDateChange(now.toISOString().split('T')[0]);
    } else if (filter === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      onDateChange(y.toISOString().split('T')[0]);
    } else if (filter === 'week') {
      onDateChange(now.toISOString().split('T')[0]);
    } else if (filter === 'month') {
      onDateChange(now.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === today;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf]">
            <div className="h-9 w-9 bg-[#e7d6bf]/30 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-44 bg-[#e7d6bf]/30 animate-pulse" />
              <div className="h-3 w-28 bg-[#e7d6bf]/30 animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#e7d6bf]/30 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">Queue date</span>
        <div className="flex items-center gap-1">
          {([
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
          ] as const).map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyQuickFilter(item.key)}
              className={`h-7 px-2.5 text-[11px] rounded-md border ${
                (item.key === 'today' && isToday) ||
                (item.key === 'week' && selectedDate === today) ||
                (item.key === 'month' && selectedDate === today)
                  ? 'border-white/40 bg-white/15 text-white'
                  : 'border-white/15 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-7 px-2 text-[11px] rounded-md border border-[#e7d6bf] bg-white text-[#2c2e4b] focus:outline-none focus:ring-1 focus:ring-[#caa26a]/40"
        />
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf]">
          <h3 className="text-sm font-semibold text-[#2c2e4b]">No patients in queue</h3>
          <p className="text-xs text-[#2c2e4b]/70 max-w-xs text-center mt-1">
            Patients added to your queue will appear here until you start their consultation.
          </p>
        </div>
      ) : (
        <div className="border border-[#e7d6bf] bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60 border-b border-[#e7d6bf]">
            <div className="col-span-4">Patient</div>
            <div className="col-span-2">File</div>
            <div className="col-span-2">Wait</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Flags</div>
            <div className="col-span-1">Actions</div>
          </div>
          <div className="divide-y divide-[#e7d6bf]">
            {queue.map((entry) => {
              const patient = entry.patient;
              const queueStatus = entry.status === 'IN_CONSULTATION' ? 'In Progress' : 'Pending';
              const appointmentId = entry.appointmentId;
              const waitTime = entry.addedAt
                ? formatDistanceToNow(new Date(entry.addedAt), { addSuffix: true })
                : '—';

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors"
                >
                  <Link href={`/doctor/patients/${patient.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center text-xs font-semibold text-[#2c2e4b] flex-shrink-0">
                      {`${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#2c2e4b] truncate">{`${patient.firstName} ${patient.lastName}`}</div>
                      <div className="md:hidden text-xs text-[#2c2e4b]/60 mt-0.5">
                        {patient.fileNumber || '—'} · {(entry as any).phone || '—'}
                      </div>
                    </div>
                  </Link>
                  <div className="hidden md:block text-sm text-[#2c2e4b]">
                    {patient.fileNumber || '—'}
                  </div>
                  <div className="hidden md:block text-sm text-[#2c2e4b]">
                    {waitTime}
                  </div>
                  <div className="hidden md:block">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium border-0 ${
                        queueStatus === 'In Progress'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {queueStatus}
                    </Badge>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1">
                    {(patient as any).allergies?.trim() && (
                      <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                        Allergies
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {appointmentId ? (
                      <Button
                        size="sm"
                        onClick={() => onOpenPatient(appointmentId, queueStatus)}
                        className={`h-8 px-3 text-xs ${
                          queueStatus === 'In Progress'
                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                            : 'bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white'
                        }`}
                      >
                        {queueStatus === 'In Progress' ? 'Continue' : 'Open'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onNewConsultation(patient.id)}
                        className="h-8 px-3 text-xs bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                      >
                        New
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[#e7d6bf]">
              <span className="text-xs text-[#2c2e4b]/60 tabular-nums">
                Page {currentPage} of {totalPages} · {total} total
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </Button>
                <span className="text-xs text-[#2c2e4b]/60 tabular-nums px-2">
                  {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
