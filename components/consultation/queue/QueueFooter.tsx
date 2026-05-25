'use client';

import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface QueueFooterProps {
  sortedQueue: AppointmentResponseDto[];
}

export function QueueFooter({ sortedQueue }: QueueFooterProps) {
  if (sortedQueue.length === 0) return null;

  const avgWaitTime = getAverageWaitTime(sortedQueue);

  return (
    <div className="p-4 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600">Average wait</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900 tracking-tight tabular-nums">
            {avgWaitTime}
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper to calculate average wait time
function getAverageWaitTime(appointments: AppointmentResponseDto[]): string {
  if (appointments.length === 0) return '-';

  const now = Date.now();
  const totalMinutes = appointments.reduce((sum, apt) => {
    if (!apt.checkedInAt) return sum;
    const waitMs = now - new Date(apt.checkedInAt).getTime();
    return sum + Math.floor(waitMs / 60000);
  }, 0);

  const avgMinutes = Math.round(totalMinutes / appointments.length);

  if (avgMinutes < 1) return '< 1 min';
  if (avgMinutes === 1) return '1 min';
  return `${avgMinutes} mins`;
}
