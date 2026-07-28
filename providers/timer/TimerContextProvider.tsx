'use client';

/**
 * Presentation Layer — TimerContextProvider
 *
 * Owns the consultation timer display state:
 * - Elapsed time since consultation started
 * - Time info (remaining, percent used, warning/overrun states)
 * - Remaining display string
 *
 * This provider is a pure computation context.
 * It does not mutate workflow state, interact with DraftService,
 * or own any patient/session lifecycle concerns.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TimeInfo {
  remaining: number;
  remainingMinutes: number;
  percentUsed: number;
  isWarning: boolean;
  isOverrun: boolean;
  slotEnd: Date;
}

interface TimerContextState {
  elapsed: string | null;
  timeInfo: TimeInfo | null;
  remainingDisplay: string | null;
  now: Date;
}

export interface TimerContextValue extends TimerContextState {
  startedAt: Date | string | null | undefined;
  slotStartTime?: Date | null | undefined;
  slotDurationMinutes?: number | null | undefined;
}

const TimerContext = createContext<TimerContextValue | null>(null);

// ============================================================================
// HELPERS
// ============================================================================

function computeElapsed(startedAt: Date | string | null | undefined): string | null {
  if (!startedAt) return null;
  const diff = new Date().getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function computeTimeInfo(
  startedAt: Date | string | null | undefined,
  slotStartTime?: Date | null | undefined,
  slotDurationMinutes?: number | null | undefined
): TimeInfo | null {
  if (!startedAt || !slotStartTime || !slotDurationMinutes) {
    return null;
  }

  const slotStart = new Date(slotStartTime);
  const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
  const elapsedMs = new Date().getTime() - new Date(startedAt).getTime();
  const totalMs = slotDurationMinutes * 60000;
  const remaining = Math.max(0, slotEnd.getTime() - new Date().getTime());
  const remainingMinutes = Math.ceil(remaining / 60000);
  const percentUsed = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

  return {
    remaining,
    remainingMinutes,
    percentUsed,
    isWarning: percentUsed >= 80 && percentUsed < 100,
    isOverrun: percentUsed >= 100,
    slotEnd,
  };
}

function computeRemainingDisplay(timeInfo: TimeInfo | null): string | null {
  if (!timeInfo) return null;

  if (timeInfo.isOverrun) {
    const overrunMinutes = Math.floor((new Date().getTime() - timeInfo.slotEnd.getTime()) / 60000);
    return `+${overrunMinutes}m over`;
  }

  if (timeInfo.remainingMinutes <= 0) return "Time's up";
  if (timeInfo.remainingMinutes > 60) {
    const hours = Math.floor(timeInfo.remainingMinutes / 60);
    const mins = timeInfo.remainingMinutes % 60;
    return `${hours}h ${mins}m left`;
  }
  return `${timeInfo.remainingMinutes}m left`;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface TimerContextProviderProps {
  children: ReactNode;
  startedAt?: Date | string | null;
  slotStartTime?: Date | null;
  slotDurationMinutes?: number | null;
}

export function TimerContextProvider({
  children,
  startedAt,
  slotStartTime,
  slotDurationMinutes,
}: TimerContextProviderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsed = useMemo(() => computeElapsed(startedAt), [startedAt, now]);
  const timeInfo = useMemo(
    () => computeTimeInfo(startedAt, slotStartTime, slotDurationMinutes),
    [startedAt, slotStartTime, slotDurationMinutes, now]
  );
  const remainingDisplay = useMemo(() => computeRemainingDisplay(timeInfo), [timeInfo, now]);

  const value = useMemo(
    () => ({
      elapsed,
      timeInfo,
      remainingDisplay,
      now,
      startedAt,
      slotStartTime,
      slotDurationMinutes,
    }),
    [elapsed, timeInfo, remainingDisplay, now, startedAt, slotStartTime, slotDurationMinutes]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTimerContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within TimerContextProvider');
  }
  return context;
}
