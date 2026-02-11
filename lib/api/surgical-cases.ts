/**
 * Surgical Cases API Client
 *
 * Type-safe API client methods for surgical case operations.
 * Used by both doctor and admin interfaces.
 */

import { apiClient, ApiResponse } from './client';

// ============================================================================
// Response DTOs
// ============================================================================

/** Lean list-item DTO returned by GET /api/doctor/surgical-cases */
export interface SurgicalCaseListItemDto {
    id: string;
    status: string;
    urgency: string;
    diagnosis: string | null;
    procedureName: string | null;
    side: string | null;
    createdAt: string;
    updatedAt: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        fileNumber: string | null;
        gender: string | null;
        dateOfBirth: string | null;
    } | null;
    primarySurgeon: {
        id: string;
        name: string;
    } | null;
    casePlan: {
        id: number;
        appointmentId: number;
        readinessStatus: string;
        readyForSurgery: boolean;
        hasProcedurePlan: boolean;
        hasRiskFactors: boolean;
        plannedAnesthesia: string | null;
        estimatedDurationMinutes: number | null;
        consentCount: number;
        imageCount: number;
    } | null;
    theaterBooking: {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
        theaterName: string | null;
    } | null;
    consultation: {
        id: number;
        appointmentId: number;
    } | null;
}

/** Pagination metadata */
export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

/** Global status count metrics */
export interface SurgicalCaseMetrics {
    total: number;
    draft: number;
    planning: number;
    readyForScheduling: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
}

/** Paginated API response data shape */
export interface SurgicalCaseListResponse {
    items: SurgicalCaseListItemDto[];
    meta: PaginationMeta;
    metrics: SurgicalCaseMetrics;
}

/** Query params for the surgical cases list */
export interface SurgicalCaseQueryParams {
    q?: string;
    status?: string;
    urgency?: string;
    page?: number;
    pageSize?: number;
}

/** Mark-ready mutation result */
export interface MarkReadyResultDto {
    id: string;
    status: string;
    previousStatus: string;
    transitionedAt: string;
}

/** Structured item from readiness validation */
export interface ReadinessItem {
    key: string;
    label: string;
    required: boolean;
    done: boolean;
}

/** Error response when mark-ready fails due to incomplete items */
export interface MarkReadyValidationError {
    success: false;
    error: string;
    missingItems?: ReadinessItem[];
    completedCount?: number;
    totalRequired?: number;
}

// ============================================================================
// Legacy DTO (for backward compatibility with existing consumers)
// ============================================================================

/** @deprecated Use SurgicalCaseListItemDto */
export type SurgicalCaseListDto = SurgicalCaseListItemDto;

// ============================================================================
// Doctor API
// ============================================================================

export const surgicalCasesApi = {
    /**
     * Get surgical cases for the authenticated doctor with pagination + filters.
     */
    async getMyCases(
        params: SurgicalCaseQueryParams = {},
    ): Promise<ApiResponse<SurgicalCaseListResponse>> {
        const qs = new URLSearchParams();
        if (params.q) qs.set('q', params.q);
        if (params.status) qs.set('status', params.status);
        if (params.urgency) qs.set('urgency', params.urgency);
        if (params.page) qs.set('page', String(params.page));
        if (params.pageSize) qs.set('pageSize', String(params.pageSize));

        const query = qs.toString();
        const endpoint = `/doctor/surgical-cases${query ? `?${query}` : ''}`;
        return apiClient.get<SurgicalCaseListResponse>(endpoint);
    },

    /**
     * Mark a surgical case as ready for scheduling.
     * Transitions: PLANNING → READY_FOR_SCHEDULING
     *
     * On 422, returns MarkReadyValidationError with structured missingItems.
     */
    async markReady(caseId: string): Promise<ApiResponse<MarkReadyResultDto>> {
        return apiClient.post<MarkReadyResultDto>(
            `/doctor/surgical-cases/${caseId}/mark-ready`,
        );
    },
};

// ============================================================================
// Admin API
// ============================================================================

export const adminSurgicalCasesApi = {
    /**
     * Get surgical cases by status (for admin scheduling)
     */
    async getByStatus(
        status: string = 'READY_FOR_SCHEDULING',
    ): Promise<ApiResponse<SurgicalCaseListItemDto[]>> {
        return apiClient.get<SurgicalCaseListItemDto[]>(
            `/admin/surgical-cases?status=${status}`,
        );
    },
};
