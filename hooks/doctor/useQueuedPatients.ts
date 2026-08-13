'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

export type QueueSortBy = 'waitTime' | 'name';
export type QueueSortOrder = 'asc' | 'desc';

interface UseQueuedPatientsOptions {
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  sortBy?: QueueSortBy;
  sortOrder?: QueueSortOrder;
  enabled?: boolean;
}

export function useQueuedPatients(options: UseQueuedPatientsOptions = {}) {
  const {
    startDate,
    endDate,
    searchQuery = '',
    sortBy = 'waitTime',
    sortOrder = 'desc',
    enabled = true,
  } = options;

  const { data: queuedData = [], isLoading: isLoadingQueued } = useQuery({
    queryKey: queryKeys.doctor.queue('patients-page'),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const queryString = params.toString();
      const url = queryString ? `/api/doctor/me/queue?${queryString}` : '/api/doctor/me/queue';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load queue');
      return res.json() as Promise<QueuePatient[]>;
    },
    enabled,
    staleTime: 1000 * 30,
  });

  const displayQueue = useMemo(() => {
    // Step 1: deduplicate by patientId, keep most recent entry
    const dedupMap = new Map<string, QueuePatient>();
    queuedData.forEach((entry) => {
      const existing = dedupMap.get(entry.patientId);
      if (!existing || new Date(entry.addedAt) > new Date(existing.addedAt)) {
        dedupMap.set(entry.patientId, entry);
      }
    });

    let list = Array.from(dedupMap.values());

    // Step 2: search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((entry) => {
        const p = entry.patient;
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.fileNumber.toLowerCase().includes(q)
        );
      });
    }

    // Step 3: sort
    list.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase();
        const nameB = `${b.patient.firstName} ${b.patient.lastName}`.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
      const timeA = new Date(a.addedAt).getTime();
      const timeB = new Date(b.addedAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [queuedData, searchQuery, sortBy, sortOrder]);

  return {
    displayQueue,
    isLoadingQueued,
    total: displayQueue.length,
  };
}
