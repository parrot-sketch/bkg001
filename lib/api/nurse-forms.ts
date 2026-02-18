/**
 * API Client: Nurse Clinical Forms
 *
 * Type-safe fetch wrappers for nurse clinical forms:
 * - Pre-Op Ward Checklist
 * - Intra-Op Nurse Record
 */

import { apiClient, ApiResponse } from './client';
import type { ClinicalFormStatus } from '@prisma/client';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import type { NurseRecoveryRecordDraft } from '@/domain/clinical-forms/NurseRecoveryRecord';

// ──────────────────────────────────────────────────────────────────────
// Response DTOs
// ──────────────────────────────────────────────────────────────────────

export interface FormSectionCompletion {
    complete: boolean;
    errors: string[];
}

export interface PreopWardFormDto {
    id: string;
    templateKey: string;
    templateVersion: number;
    status: ClinicalFormStatus;
    data: NursePreopWardChecklistDraft;
    sectionCompletion: Record<string, FormSectionCompletion>;
    signedByUserId: string | null;
    signedAt: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PreopWardFormPatient {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    allergies: string | null;
}

export interface PreopWardFormResponse {
    form: PreopWardFormDto | null;
    patient: PreopWardFormPatient;
    caseStatus: string;
    procedureName: string | null;
    side: string | null;
    surgeonName: string | null;
    casePlan?: {
        procedure_plan: string | null;
        pre_op_notes: string | null;
        special_instructions: string | null;
        planned_anesthesia: string | null;
        implant_details: string | null;
    } | null;
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

export const nurseFormsApi = {
    /**
     * Get or auto-create the pre-op ward checklist for a surgical case.
     */
    async getPreopWardChecklist(caseId: string): Promise<ApiResponse<PreopWardFormResponse>> {
        return apiClient.get<PreopWardFormResponse>(
            `/nurse/surgical-cases/${caseId}/forms/preop-ward`,
        );
    },

    /**
     * Save draft updates to the checklist.
     */
    async savePreopWardChecklist(
        caseId: string,
        data: NursePreopWardChecklistDraft,
    ): Promise<ApiResponse<PreopWardFormDto>> {
        return apiClient.put<PreopWardFormDto>(
            `/nurse/surgical-cases/${caseId}/forms/preop-ward`,
            { data },
        );
    },

    /**
     * Finalize the checklist (validates all required fields).
     */
    async finalizePreopWardChecklist(caseId: string): Promise<ApiResponse<FinalizeResult>> {
        return apiClient.post<FinalizeResult>(
            `/nurse/surgical-cases/${caseId}/forms/preop-ward/finalize`,
        );
    },

    /**
     * Get all medication administrations for a surgical case.
     */
    async getMedicationAdministrations(caseId: string): Promise<ApiResponse<MedicationAdministration[]>> {
        return apiClient.get<MedicationAdministration[]>(
            `/nurse/surgical-cases/${caseId}/med-admin`,
        );
    },

    /**
     * Record a new medication administration (or draft).
     */
    async administerMedication(caseId: string, data: any): Promise<ApiResponse<MedicationAdministration>> {
        return apiClient.post<MedicationAdministration>(
            `/nurse/surgical-cases/${caseId}/med-admin`,
            data,
        );
    },

    /**
     * Void a medication administration.
     */
    async voidMedication(caseId: string, adminId: string, reason: string): Promise<ApiResponse<MedicationAdministration>> {
        return apiClient.post<MedicationAdministration>(
            `/nurse/surgical-cases/${caseId}/med-admin/${adminId}/void`,
            { reason },
        );
    },

    /**
     * Search for eligible medications in inventory.
     */
    async searchMedications(caseId: string, query: string): Promise<ApiResponse<MedicationSearchItem[]>> {
        return apiClient.get<MedicationSearchItem[]>(
            `/nurse/surgical-cases/${caseId}/medications?q=${encodeURIComponent(query)}`,
        );
    },
};

export interface MedicationAdministration {
    id: string;
    surgical_case_id: string;
    form_response_id: string | null;
    inventory_item_id: number | null;
    name: string;
    dose_value: number;
    dose_unit: string;
    route: string;
    status: 'DRAFT' | 'ADMINISTERED' | 'VOIDED';
    administered_at: string | null;
    administered_by: string | null;
    void_reason: string | null;
    notes: string | null;
    created_at: string;
}

export interface MedicationSearchItem {
    id: number;
    name: string;
    sku: string | null;
    unit_of_measure: string;
    unit_cost: number;
    quantity_on_hand: number;
    is_billable: boolean;
}


// ──────────────────────────────────────────────────────────────────────
// Intra-Op Record DTOs
// ──────────────────────────────────────────────────────────────────────

export interface IntraOpFormDto {
    id: string;
    templateKey: string;
    templateVersion: number;
    status: ClinicalFormStatus;
    data: NurseIntraOpRecordDraft;
    sectionCompletion: Record<string, FormSectionCompletion>;
    signedByUserId: string | null;
    signedAt: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IntraOpFormResponse {
    form: IntraOpFormDto | null;
    patient: PreopWardFormPatient;
    caseStatus: string;
    procedureName: string | null;
    side: string | null;
    surgeonName: string | null;
    casePlan?: {
        procedure_plan: string | null;
        pre_op_notes: string | null;
        special_instructions: string | null;
        planned_anesthesia: string | null;
        implant_details: string | null;
    } | null;
}

// ──────────────────────────────────────────────────────────────────────
// Intra-Op Record API methods
// ──────────────────────────────────────────────────────────────────────

export const nurseIntraOpApi = {
    /**
     * Get or auto-create the intra-op record for a surgical case.
     */
    async getIntraOpRecord(caseId: string): Promise<ApiResponse<IntraOpFormResponse>> {
        return apiClient.get<IntraOpFormResponse>(
            `/nurse/surgical-cases/${caseId}/forms/intraop`,
        );
    },

    /**
     * Save draft updates to the intra-op record.
     */
    async saveIntraOpRecord(
        caseId: string,
        data: NurseIntraOpRecordDraft,
    ): Promise<ApiResponse<IntraOpFormDto>> {
        return apiClient.put<IntraOpFormDto>(
            `/nurse/surgical-cases/${caseId}/forms/intraop`,
            { data },
        );
    },

    /**
     * Finalize the intra-op record (validates all required fields).
     */
    async finalizeIntraOpRecord(caseId: string): Promise<ApiResponse<FinalizeResult>> {
        return apiClient.post<FinalizeResult>(
            `/nurse/surgical-cases/${caseId}/forms/intraop/finalize`,
        );
    },
};

// ──────────────────────────────────────────────────────────────────────
// Recovery Record DTOs
// ──────────────────────────────────────────────────────────────────────

export interface RecoveryFormDto {
    id: string;
    templateKey: string;
    templateVersion: number;
    status: ClinicalFormStatus;
    data: NurseRecoveryRecordDraft;
    sectionCompletion: Record<string, FormSectionCompletion>;
    signedByUserId: string | null;
    signedAt: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RecoveryFormResponse {
    form: RecoveryFormDto | null;
    patient: PreopWardFormPatient;
    caseStatus: string;
    procedureName: string | null;
    side: string | null;
    surgeonName: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// Recovery Record API methods
// ──────────────────────────────────────────────────────────────────────

export const nurseRecoveryApi = {
    /**
     * Get or auto-create the recovery record for a surgical case.
     */
    async getRecoveryRecord(caseId: string): Promise<ApiResponse<RecoveryFormResponse>> {
        return apiClient.get<RecoveryFormResponse>(
            `/nurse/surgical-cases/${caseId}/forms/recovery`,
        );
    },

    /**
     * Save draft updates to the recovery record.
     */
    async saveRecoveryRecord(
        caseId: string,
        data: NurseRecoveryRecordDraft,
    ): Promise<ApiResponse<RecoveryFormDto>> {
        return apiClient.put<RecoveryFormDto>(
            `/nurse/surgical-cases/${caseId}/forms/recovery`,
            { data },
        );
    },

    /**
     * Finalize the recovery record (validates all required fields).
     */
    async finalizeRecoveryRecord(caseId: string): Promise<ApiResponse<FinalizeResult>> {
        return apiClient.post<FinalizeResult>(
            `/nurse/surgical-cases/${caseId}/forms/recovery/finalize`,
        );
    },
};
