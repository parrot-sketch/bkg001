/**
 * useDoctorQueue Hook
 * 
 * Fetches patients in the doctor's queue from PatientQueue table via API.
 * These are PatientQueue entries with status WAITING or IN_CONSULTATION.
 * 
 * Used by: Doctor dashboard - Patient Queue (Zone 2)
 * 
 * Query: PatientQueue where doctor_id = doctorId AND status IN (WAITING, IN_CONSULTATION)
 * Sorted by: added_at ascending (oldest first = first in queue)
 * 
 * Polling: 30 seconds (consistent with notification polling)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';

export interface QueuePatient {
  id: number;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
  };
  appointmentId: number | null;
  appointmentDate: string | null;
  time: string | null;
  type: string;
  status: string;
  addedAt: string;
  waitTime: string;
  notes: string | null;
  isWalkIn: boolean;
}

async function fetchDoctorQueue(doctorId: string, startDate?: string, endDate?: string): Promise<QueuePatient[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const queryString = params.toString();
  const url = queryString ? `/api/doctor/${doctorId}/queue?${queryString}` : `/api/doctor/${doctorId}/queue`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load queue');
  }
  return response.json();
}

function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export interface UseDoctorQueueOptions {
  startDate?: string;
  endDate?: string;
}

export function useDoctorQueue(doctorId: string | undefined, options: UseDoctorQueueOptions & { enabled?: boolean } = {}) {
  const { startDate, endDate, enabled = true } = options;
  
  const today = getTodayRange();
  const effectiveStart = startDate ?? today.startDate;
  const effectiveEnd = endDate ?? today.endDate;
  
  return useQuery<QueuePatient[]>({
    queryKey: queryKeys.doctor.queue(doctorId ?? ''),
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }
      
      return fetchDoctorQueue(doctorId, effectiveStart, effectiveEnd);
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    networkMode: 'offlineFirst',
    enabled: enabled && !!doctorId,
  });
}
