'use client';

import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface QueueFooterProps {
  sortedQueue: AppointmentResponseDto[];
}

export function QueueFooter({ sortedQueue }: QueueFooterProps) {
  if (sortedQueue.length === 0) return null;

  const avgWaitTime = getAverageWaitTime(sortedQueue);

  return (
    <div className="p-4 border-t border-slate-200 bg-slate-50/80 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Stat</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-700 tracking-tight">
            {avgWaitTime}
          </span>
          <span className="text-[9px] text-slate-400 font-medium uppercase">Avg Wait</span>
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
