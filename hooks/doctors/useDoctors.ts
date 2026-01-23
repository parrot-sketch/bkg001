/**
 * useDoctors Hook
 * 
 * React Query hook for fetching the list of available doctors.
 * 
 * REFACTORED FROM: Manual useState/useEffect fetch in app/page.tsx
 * REASON: Eliminates 150+ lines of complex fetch logic, provides automatic
 * caching, retries, deduplication, and error handling.
 * 
 * Caching Strategy:
 * - Public data that changes infrequently
 * - 1 hour staleTime (doctors don't change often)
 * - 24 hour gcTime (keep in cache for a day)
 * - Automatic background refetch on window focus
 */

import { useQuery } from '@tanstack/react-query';

export interface Doctor {
  id: string;
  name: string;
  title?: string;
  specialization: string;
  profile_image?: string;
  bio?: string;
  education?: string;
  focus_areas?: string;
  professional_affiliations?: string;
  clinic_location?: string;
  // Note: email and phone are excluded from public API response for security
}

interface DoctorsResponse {
  success: boolean;
  data: Doctor[];
  error?: string;
}

/**
 * Fetches the list of available doctors from the API
 */
async function fetchDoctors(): Promise<Doctor[]> {
  const response = await fetch('/api/doctors', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch doctors: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format from server');
  }

  const result: DoctorsResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load doctors');
  }

  return Array.isArray(result.data) ? result.data : [];
}

/**
 * React Query hook for fetching doctors
 * 
 * @returns Query result with doctors data, loading state, and error state
 */
export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: fetchDoctors,
    staleTime: 1000 * 60 * 60, // 1 hour - doctors list changes infrequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache for a day
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Refetch on window focus for fresh data (React Query default)
    refetchOnWindowFocus: true,
    // Don't refetch on reconnect for public data (not critical)
    refetchOnReconnect: false,
  });
}
