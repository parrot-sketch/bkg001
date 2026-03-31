/**
 * Patient Registry DTO — Minimum Necessary for List View
 *
 * HIPAA §164.502(b): Only includes demographic + operational fields.
 * Medical data (allergies, conditions, insurance) is EXCLUDED from list views.
 * Full patient detail requires a separate authenticated fetch.
 */
export interface PatientRegistryDto {
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  profileImage?: string;
  colorCode?: string;
  createdAt: string;
  totalVisits: number;
  lastVisitAt: string | null;
  queueStatus: 'WAITING' | 'IN_CONSULTATION' | null;
  outstandingBalance: number;
}

export interface PatientStatsDto {
  totalRecords: number;
  newToday: number;
  newThisMonth: number;
}

export interface PatientListMeta {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface PatientListResponse {
  success: true;
  data: PatientRegistryDto[];
  meta: PatientListMeta;
}

export interface PatientStatsResponse {
  success: true;
  data: PatientStatsDto;
}
