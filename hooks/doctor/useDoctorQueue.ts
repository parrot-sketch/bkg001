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

async function fetchDoctorQueue(doctorId: string): Promise<QueuePatient[]> {
  const response = await fetch(`/api/doctor/${doctorId}/queue`);
  if (!response.ok) {
    throw new Error('Failed to load queue');
  }
  return response.json();
}

export function useDoctorQueue(doctorId: string | undefined, enabled = true) {
  return useQuery<QueuePatient[]>({
    queryKey: ['doctor', doctorId, 'queue'],
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }
      
      return fetchDoctorQueue(doctorId);
    },
    staleTime: 1000 * 30, // 30 seconds - polling + invalidation keep this fresh enough
    gcTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60_000, // Was 30s — reduced to conserve DB connections
    networkMode: 'offlineFirst',
    enabled: enabled && !!doctorId,
  });
}
