/**
 * API Client: Surgeon Operative Note
 *
 * Type-safe fetch wrappers for the doctor-owned operative note form.
 */

import { apiClient, ApiResponse } from './client';
import type { ClinicalFormStatus } from '@prisma/client';
import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

// ──────────────────────────────────────────────────────────────────────
// Response DTOs
// ──────────────────────────────────────────────────────────────────────

export interface FormSectionCompletion {
    complete: boolean;
    errors: string[];
}

export interface OperativeNoteFormDto {
    id: string;
    templateKey: string;
    templateVersion: number;
    status: ClinicalFormStatus;
    data: SurgeonOperativeNoteDraft;
    sectionCompletion: Record<string, FormSectionCompletion>;
    signedByUserId: string | null;
    signedAt: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OperativeNotePatient {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string | null;
    allergies: string | null;
}

export interface OperativeNoteFormResponse {
    form: OperativeNoteFormDto | null;
    patient: OperativeNotePatient;
    caseStatus: string;
    procedureName: string | null;
    side: string | null;
    surgeonName: string | null;
    nurseIntraOpStatus: ClinicalFormStatus | null;
    nurseHasDiscrepancy: boolean;
}

export interface FinalizeResult {
    id: string;
    status: ClinicalFormStatus;
    signedAt: string;
    signedByUserId: string;
}

// ──────────────────────────────────────────────────────────────────────
// API methods
// ──────────────────────────────────────────────────────────────────────

export const doctorOperativeNoteApi = {
    /**
     * Get or auto-create the operative note for a surgical case.
     */
    async getOperativeNote(caseId: string): Promise<ApiResponse<OperativeNoteFormResponse>> {
        return apiClient.get<OperativeNoteFormResponse>(
            `/doctor/surgical-cases/${caseId}/forms/operative-note`,
        );
    },

    /**
     * Save draft updates to the operative note.
     */
    async saveOperativeNote(
        caseId: string,
        data: SurgeonOperativeNoteDraft,
    ): Promise<ApiResponse<OperativeNoteFormDto>> {
        return apiClient.put<OperativeNoteFormDto>(
            `/doctor/surgical-cases/${caseId}/forms/operative-note`,
            { data },
        );
    },

    /**
     * Finalize (sign) the operative note.
     */
    async finalizeOperativeNote(caseId: string): Promise<ApiResponse<FinalizeResult>> {
        return apiClient.post<FinalizeResult>(
            `/doctor/surgical-cases/${caseId}/forms/operative-note/finalize`,
            {},
        );
    },

    /**
     * Import/refresh implants + specimens from nurse intra-op record.
     */
    async importFromIntraOp(caseId: string): Promise<ApiResponse<OperativeNoteFormDto>> {
        return apiClient.post<OperativeNoteFormDto>(
            `/doctor/surgical-cases/${caseId}/forms/operative-note`,
            {},
        );
    },
};
