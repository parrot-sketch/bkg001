/**
 * useDoctorPatients Hook
 *
 * React Query hook for fetching the current doctor's patients from explicit
 * DoctorPatientAssignment records.
 *
 * Supports server-side:
 *   - Status filtering (ACTIVE | DISCHARGED | TRANSFERRED | INACTIVE | ALL)
 *   - Free-text search (first/last name, file number, email, phone)
 *   - Sorting by assignedAt or name
 *   - Pagination (skip / take)
 *
 * The returned `data` object is properly typed — no `as any` casts needed.
 * Each patient DTO includes `assignedAt`, `lastVisitDate`, and `visitCount`
 * populated directly by the API route (no second hook needed for visit decoration).
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

// ── Option types ──────────────────────────────────────────────────────────────

export type DoctorPatientSortBy    = 'assignedAt' | 'name';
export type DoctorPatientSortOrder = 'asc' | 'desc';
export type DoctorPatientStatus    = 'ACTIVE' | 'DISCHARGED' | 'TRANSFERRED' | 'INACTIVE' | 'ALL';

export interface UseDoctorPatientsOptions {
  /** Filter by assignment lifecycle status. Default: 'ACTIVE' */
  status?:    DoctorPatientStatus;
  /** Pagination offset. Default: 0 */
  skip?:      number;
  /** Records per page (max 200). Default: 50 */
  take?:      number;
  /** Free-text search across name, file number, email, phone. */
  search?:    string;
  /** Sort field. Default: 'assignedAt' */
  sortBy?:    DoctorPatientSortBy;
  /** Sort direction. Default: 'desc' */
  sortOrder?: DoctorPatientSortOrder;
}

// ── Typed result ─────────────────────────────────────────────────────────────

export interface DoctorPatientsResult {
  patients: PatientResponseDto[];
  /** Total records matching the current filters (across all pages). */
  total: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param enabled  - Whether the query should run (default: true).
 *                   Pass `!!user` to gate on authentication.
 * @param options  - Filter / sort / pagination options.
 */
export function useDoctorPatients(
  enabled = true,
  options?: UseDoctorPatientsOptions
): ReturnType<typeof useQuery<DoctorPatientsResult>> {
  const status    = options?.status    ?? 'ACTIVE';
  const skip      = options?.skip      ?? 0;
  const take      = options?.take      ?? 50;
  const search    = options?.search?.trim() ?? '';
  const sortBy    = options?.sortBy    ?? 'assignedAt';
  const sortOrder = options?.sortOrder ?? 'desc';

  return useQuery<DoctorPatientsResult>({
    // Include all params in the key so React Query invalidates on any change
    queryKey: ['doctor', 'me', 'patients', status, skip, take, search, sortBy, sortOrder],

    queryFn: async (): Promise<DoctorPatientsResult> => {
      const response = await doctorApi.getMyPatients({
        status,
        skip,
        take,
        search: search || undefined,
        sortBy,
        sortOrder,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load patients');
      }

      // The API route returns `total` in the response body alongside `data`.
      // `ApiResponse` is typed as `{ success, data, error }` but the raw JSON
      // also includes `total` — cast via the intersection type on getMyPatients.
      const total = (response as any).total ?? (response.data?.length ?? 0);

      return {
        patients: (response.data ?? []) as PatientResponseDto[],
        total,
      };
    },

    staleTime:           1000 * 60 * 5,  // 5 min — roster changes infrequently
    gcTime:              1000 * 60 * 15, // 15 min
    retry:               2,
    refetchOnWindowFocus: true,
    enabled,
  });
}
