'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomTimeRangePickerProps {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  className?: string;
  step?: number; // minutes (default: 15)
}

export function CustomTimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  className,
  step = 15,
}: CustomTimeRangePickerProps) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
  const isValid = durationMins > 0;

  const formatDuration = (mins: number) => {
    if (mins <= 0) return 'Invalid';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Start Time</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              step={step * 60}
              className={cn(
                'h-11 pl-10 text-center font-mono text-sm',
                !isValid && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </div>
        </div>
        <div className="pt-6">
          <span className="text-muted-foreground text-lg font-medium">→</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">End Time</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              step={step * 60}
              className={cn(
                'h-11 pl-10 text-center font-mono text-sm',
                !isValid && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </div>
        </div>
      </div>
      {isValid ? (
        <div className="flex items-center justify-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Duration:</span>
          <span className="text-sm font-semibold text-foreground">{formatDuration(durationMins)}</span>
        </div>
      ) : (
        <p className="text-xs text-destructive text-center">End time must be after start time</p>
      )}
    </div>
  );
}
