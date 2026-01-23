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
 * 
 * IMPORTANT: This function handles production "Connection closed" errors by:
 * 1. Using cache: 'no-store' to prevent browser/edge caching
 * 2. Cloning response before reading to avoid stream consumption issues
 * 3. Adding cache-busting query parameter for production
 */
async function fetchDoctors(): Promise<Doctor[]> {
  // Add cache-busting parameter for production to prevent stale cached responses
  const cacheBuster = Date.now();
  const url = `/api/doctors?_t=${cacheBuster}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
    // CRITICAL: Prevent any caching that could cause "Connection closed" errors
    cache: 'no-store',
    // Prevent credentials from being sent (not needed for public endpoint)
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch doctors: ${response.status} ${response.statusText}`);
  }

  // Clone response before reading to avoid stream consumption issues
  // This is critical for production where responses might be cached
  const clonedResponse = response.clone();
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // Try to read error message from cloned response
    try {
      const text = await clonedResponse.text();
      throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
    } catch {
      throw new Error('Invalid response format from server');
    }
  }

  // Read JSON from original response (cloned response is backup)
  let result: DoctorsResponse;
  try {
    result = await response.json();
  } catch (jsonError) {
    // If JSON parsing fails, try reading as text for debugging
    const text = await clonedResponse.text();
    throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`);
  }

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
    retry: 3, // Retry 3 times on failure (increased for production reliability)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // CRITICAL: Disable refetch on window focus to prevent "Connection closed" errors
    // The cache-busting in fetchDoctors ensures fresh data when needed
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect for public data (not critical)
    refetchOnReconnect: false,
    // Prevent refetch on mount if data is fresh (reduces API calls)
    refetchOnMount: true, // Still refetch on mount to ensure fresh data
  });
}
