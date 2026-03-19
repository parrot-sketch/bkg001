/**
 * Frontdesk Queue Management Hooks
 * 
 * Hooks for fetching:
 * - Patients checked in but not yet assigned to a queue
 * - Live queue board (all active queue entries grouped by doctor)
 */

import { useQuery } from '@tanstack/react-query';

export interface CheckedInPatient {
  id: number;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
    phone: string;
  };
  appointmentDate: string;
  time: string | null;
  type: string;
  checkedInAt: string;
  waitTime: string;
  isWalkIn: boolean;
}

export interface QueueEntry {
  id: number;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
  };
  doctorId: string;
  doctorName: string;
  appointmentId: number | null;
  status: 'WAITING' | 'IN_CONSULTATION';
  addedAt: string;
  waitTime: string;
  notes: string | null;
  isWalkIn: boolean;
}

export interface DoctorWithQueue {
  doctorId: string;
  doctorName: string;
  patients: QueueEntry[];
}

async function fetchCheckedInAwaitingAssignment(): Promise<CheckedInPatient[]> {
  const response = await fetch('/api/frontdesk/queue/checked-in');
  if (!response.ok) {
    throw new Error('Failed to fetch checked-in patients');
  }
  return response.json();
}

async function fetchLiveQueueBoard(): Promise<DoctorWithQueue[]> {
  const response = await fetch('/api/frontdesk/queue/live');
  if (!response.ok) {
    throw new Error('Failed to fetch live queue');
  }
  return response.json();
}

/**
 * Hook for fetching patients checked in but awaiting queue assignment
 */
export function useCheckedInAwaitingAssignment() {
  return useQuery<CheckedInPatient[]>({
    queryKey: ['frontdesk', 'checked-in-awaiting-assignment'],
    queryFn: fetchCheckedInAwaitingAssignment,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 2,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching the live queue board
 */
export function useLiveQueueBoard() {
  return useQuery<DoctorWithQueue[]>({
    queryKey: ['frontdesk', 'live-queue-board'],
    queryFn: fetchLiveQueueBoard,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 2,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
