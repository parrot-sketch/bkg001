'use client';

/**
 * Presentation Layer — QueueContextProvider
 *
 * Owns the queue display state for the active consultation:
 * - Waiting queue (patients checked in / ready for consultation)
 * - Queue refetch operations
 * - Loading state for queue data
 *
 * This provider uses PatientQueue as the single source of truth for
 * the doctor's active queue, ensuring consistency with frontdesk
 * queue operations.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';
import { useDoctorQueue } from '@/hooks/doctor/useDoctorQueue';

// ============================================================================
// TYPES
// ============================================================================

interface QueueContextState {
  queueLoaded: boolean;
}

type QueueContextAction =
  | { type: 'SET_LOADED'; payload: boolean };

// ============================================================================
// REDUCER
// ============================================================================

function createInitialQueueState(): QueueContextState {
  return {
    queueLoaded: false,
  };
}

function queueContextReducer(state: QueueContextState, action: QueueContextAction): QueueContextState {
  switch (action.type) {
    case 'SET_LOADED':
      return { ...state, queueLoaded: action.payload };
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface QueueContextValue {
  waitingQueue: QueuePatient[];
  refetchQueue: () => Promise<unknown>;
  isQueueRefetching: boolean;
  queueReady: boolean;
  loadWaitingQueue: () => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface QueueContextProviderProps {
  children: ReactNode;
  doctorId: string | null;
  currentAppointmentId: number | null;
}

export function QueueContextProvider({
  children,
  doctorId,
  currentAppointmentId,
}: QueueContextProviderProps) {
  const [state, dispatch] = useReducer(queueContextReducer, createInitialQueueState());

  const {
    data: queue = [],
    refetch: refetchQueue,
    isRefetching: isQueueRefetching,
    isFetched,
    isError,
  } = useDoctorQueue(doctorId ?? undefined, { enabled: state.queueLoaded });

  const waitingQueue = useMemo(() => {
    const visible = new Set(['WAITING', 'CHECKED_IN', 'READY_FOR_CONSULTATION', 'IN_CONSULTATION']);
    return queue.filter((item) =>
      item.appointmentId !== currentAppointmentId &&
      visible.has(item.status)
    );
  }, [queue, currentAppointmentId]);

  const refetchRef = React.useRef(refetchQueue);
  React.useEffect(() => {
    refetchRef.current = refetchQueue;
  }, [refetchQueue]);

  const loadWaitingQueue = useCallback(() => {
    if (!state.queueLoaded) {
      dispatch({ type: 'SET_LOADED', payload: true });
      refetchRef.current();
    }
  }, [state.queueLoaded]);

  const queueReady = state.queueLoaded && (isFetched || isError);

  const value = useMemo(
    () => ({
      waitingQueue,
      refetchQueue,
      isQueueRefetching,
      queueReady,
      loadWaitingQueue,
    }),
    [waitingQueue, refetchQueue, isQueueRefetching, queueReady, loadWaitingQueue]
  );

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useQueueContext() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within QueueContextProvider');
  }
  return context;
}
