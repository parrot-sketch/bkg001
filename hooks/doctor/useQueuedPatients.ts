'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

export type QueueSortBy = 'waitTime' | 'name' | 'addedAt';
export type QueueSortOrder = 'asc' | 'desc';

interface UseQueuedPatientsOptions {
  date?: string;
  searchQuery?: string;
  sortBy?: QueueSortBy;
  sortOrder?: QueueSortOrder;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useQueuedPatients(options: UseQueuedPatientsOptions = {}) {
  const {
    date,
    searchQuery = '',
    sortBy = 'waitTime',
    sortOrder = 'desc',
    page = 1,
    pageSize = 20,
    enabled = true,
  } = options;

  const skip = (page - 1) * pageSize;

  const { data: rawData, isLoading: isLoadingQueued } = useQuery<{ data: QueuePatient[]; total: number; skip: number; take: number }>({
    queryKey: ['doctor', 'queue', 'patients-page', date, searchQuery, sortBy, sortOrder, skip, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);
      if (skip > 0) params.set('skip', String(skip));
      if (pageSize !== 20) params.set('take', String(pageSize));
      const queryString = params.toString();
      const url = queryString ? `/api/doctor/me/queue?${queryString}` : '/api/doctor/me/queue';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load queue');
      return res.json() as Promise<{ data: QueuePatient[]; total: number; skip: number; take: number }>;
    },
    enabled,
    staleTime: 1000 * 30,
  });

  const displayQueue = rawData?.data ?? [];
  const total = rawData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    displayQueue,
    isLoadingQueued,
    total,
    totalPages,
    page,
    pageSize,
  };
}
