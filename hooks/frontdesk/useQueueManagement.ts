/**
 * Frontdesk Queue Management Hooks
 * 
 * These hooks are DEPRECATED in favor of useFrontdeskDashboard.
 * The dashboard hook already fetches all queue data with proper caching.
 * 
 * These hooks now serve as fallback for components that need direct access
 * without going through the dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';

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
 * @deprecated Use useFrontdeskDashboard() from use-frontdesk-dashboard.ts instead
 * This hook now relies on dashboard data for polling - no independent polling
 */
export function useCheckedInAwaitingAssignment() {
  return useQuery<CheckedInPatient[]>({
    queryKey: queryKeys.frontdesk.checkedInAwaitingAssignment(),
    queryFn: fetchCheckedInAwaitingAssignment,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching the live queue board
 * @deprecated Use useFrontdeskDashboard() from use-frontdesk-dashboard.ts instead
 * This hook now relies on dashboard data for polling - no independent polling
 */
export function useLiveQueueBoard() {
  return useQuery<DoctorWithQueue[]>({
    queryKey: queryKeys.frontdesk.liveQueueBoard(),
    queryFn: fetchLiveQueueBoard,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
