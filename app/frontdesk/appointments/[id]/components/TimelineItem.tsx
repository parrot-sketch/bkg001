'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  label: string;
  time?: Date | string;
  done?: boolean;
  active?: boolean;
  variant?: 'destructive';
}

export function TimelineItem({ label, time, done, active, variant }: TimelineItemProps) {
  const timeStr = time && !isNaN(new Date(time).getTime())
    ? formatDistanceToNow(new Date(time), { addSuffix: true })
    : null;

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full mt-1',
            done && variant === 'destructive' && 'bg-red-500',
            done && !variant && 'bg-[#2c2e4b]/60',
            active && 'bg-[#caa26a] animate-pulse',
            !done && !active && 'bg-[#e7d6bf]'
          )}
        />
        <div className="w-px flex-1 bg-[#e7d6bf] mt-1" />
      </div>
      <div className="min-w-0 pb-1">
        <p className={cn(
          'text-xs font-medium',
          done && variant === 'destructive' && 'text-red-600',
          done && !variant && 'text-[#2c2e4b]',
          active && 'text-[#2c2e4b]',
          !done && !active && 'text-[#2c2e4b]/50'
        )}>
          {label}
        </p>
        {timeStr && (
          <p className="text-[10px] text-[#2c2e4b]/50">{timeStr}</p>
        )}
      </div>
    </div>
  );
}
