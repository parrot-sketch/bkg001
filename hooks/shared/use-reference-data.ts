/**
 * Reference Data Hooks
 * 
 * Hooks for fetching static/semi-static reference data used across the app.
 * Uses aggressive caching since this data changes rarely.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { apiClient } from '@/lib/api/client';

const REFERENCE_DATA_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const REFERENCE_DATA_GC_TIME = 30 * 60 * 1000; // 30 minutes

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
}

interface Service {
  id: number;
  serviceName: string;
  description: string | null;
  price: number;
  category: string | null;
}

interface Theater {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  hourlyRate: number | null;
}

interface AnesthesiaType {
  id: string;
  name: string;
  code: string;
}

export function useDoctors() {
  return useQuery<Doctor[], Error>({
    queryKey: queryKeys.shared.doctors(),
    queryFn: async () => {
      const response = await apiClient.get<Doctor[]>('/doctors');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch doctors');
      }
      return response.data || [];
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useServices(category?: string) {
  return useQuery<Service[], Error>({
    queryKey: ['services', category],
    queryFn: async () => {
      const url = category ? `/services?category=${category}` : '/services';
      const response = await apiClient.get<Service[]>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch services');
      }
      return response.data || [];
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useTheaters() {
  return useQuery<Theater[], Error>({
    queryKey: queryKeys.frontdesk.theaters(),
    queryFn: async () => {
      const response = await apiClient.get<Theater[]>('/theaters');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch theaters');
      }
      return response.data || [];
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useAnesthesiaTypes() {
  return useQuery<AnesthesiaType[], Error>({
    queryKey: ['anesthesia-types'],
    queryFn: async () => {
      const response = await apiClient.get<AnesthesiaType[]>('/reference/anesthesia-types');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch anesthesia types');
      }
      return response.data || [];
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}