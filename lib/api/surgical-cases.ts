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

export interface SurgicalCaseListDto {
    id: string;
    status: string;
    urgency: string;
    diagnosis: string | null;
    procedureName: string | null;
    createdAt: string;
    updatedAt?: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        fileNumber: string | null;
        dateOfBirth?: string | null;
        gender?: string | null;
        allergies?: string | null;
    } | null;
    primarySurgeon: {
        id: string;
        name: string;
        specialization?: string | null;
    } | null;
    casePlan: {
        id: number;
        readinessStatus: string;
        readyForSurgery: boolean;
        procedurePlan: string | null;
        plannedAnesthesia?: string | null;
        specialInstructions?: string | null;
        appointmentId: number;
    } | null;
    theaterBooking: {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
        theaterName?: string | null;
        theater?: { id: string; name: string; type: string } | null;
    } | null;
    consultation: {
        id: number;
        appointmentId: number;
        completedAt: string | null;
    } | null;
}

export interface MarkReadyResultDto {
    id: string;
    status: string;
    previousStatus: string;
    transitionedAt: string;
}

// ============================================================================
// Doctor API
// ============================================================================

export const surgicalCasesApi = {
    /**
     * Get all surgical cases for the authenticated doctor
     */
    async getMyCases(): Promise<ApiResponse<SurgicalCaseListDto[]>> {
        return apiClient.get<SurgicalCaseListDto[]>('/doctor/surgical-cases');
    },

    /**
     * Mark a surgical case as ready for scheduling
     * Transitions: PLANNING → READY_FOR_SCHEDULING
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
    ): Promise<ApiResponse<SurgicalCaseListDto[]>> {
        return apiClient.get<SurgicalCaseListDto[]>(
            `/admin/surgical-cases?status=${status}`,
        );
    },
};
