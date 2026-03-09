'use client';

import { useState, useEffect, useMemo } from 'react';

interface ConsultationTimerProps {
  startedAt?: Date | string | null;
  slotStartTime?: Date | null;
  slotDurationMinutes?: number | null;
}

export function useConsultationTimer({
  startedAt,
  slotStartTime,
  slotDurationMinutes,
}: ConsultationTimerProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Formatted elapsed time
  const elapsed = useMemo(() => {
    if (!startedAt) return null;
    const diff = now.getTime() - new Date(startedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [startedAt, now]);

  // Calculate time remaining and warning states
  const timeInfo = useMemo(() => {
    if (!startedAt || !slotStartTime || !slotDurationMinutes) {
      return null;
    }

    const slotStart = new Date(slotStartTime);
    const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
    const elapsedMs = now.getTime() - new Date(startedAt).getTime();
    const totalMs = slotDurationMinutes * 60000;
    const remaining = Math.max(0, slotEnd.getTime() - now.getTime());
    const remainingMinutes = Math.ceil(remaining / 60000);
    const percentUsed = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

    // Warning thresholds
    const isWarning = percentUsed >= 80 && percentUsed < 100; // 80-100%
    const isOverrun = percentUsed >= 100; // >100%

    return {
      remaining,
      remainingMinutes,
      percentUsed,
      isWarning,
      isOverrun,
      slotEnd,
    };
  }, [startedAt, slotStartTime, slotDurationMinutes, now]);

  // Formatted remaining time
  const remainingDisplay = useMemo(() => {
    if (!timeInfo) return null;
    
    if (timeInfo.isOverrun) {
      const overrunMinutes = Math.floor(
        (now.getTime() - timeInfo.slotEnd.getTime()) / 60000
      );
      return `+${overrunMinutes}m over`;
    }

    if (timeInfo.remainingMinutes <= 0) return "Time's up";
    if (timeInfo.remainingMinutes > 60) {
      const hours = Math.floor(timeInfo.remainingMinutes / 60);
      const mins = timeInfo.remainingMinutes % 60;
      return `${hours}h ${mins}m left`;
    }
    return `${timeInfo.remainingMinutes}m left`;
  }, [timeInfo, now]);

  return {
    elapsed,
    timeInfo,
    remainingDisplay,
    now,
  };
}
