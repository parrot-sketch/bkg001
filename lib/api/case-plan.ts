import { apiClient, ApiResponse } from './client';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

export interface CasePlanResponseDto {
    id: number;
    appointmentId: number;
    patientId: string;
    doctorId: string;
    surgicalCaseId?: string | null;
    procedurePlan: string | null;
    riskFactors?: string | null;
    preOpNotes?: string | null;
    implantDetails?: string | null;
    anesthesiaPlan?: string | null;
    specialInstructions?: string | null;
    readinessStatus: string;
    createdAt: string;
    updatedAt: string;

    // Surgical Case (linked)
    surgicalCase?: {
        id: string;
        status: string;
        urgency: string;
    };

    // Relations (Mapped from backend)
    consents?: Array<{
        id: string;
        title: string;
        type: string;
        status: string;
        createdAt: string;
    }>;
    images?: Array<{
        id: number;
        imageUrl: string;
        thumbnailUrl?: string | null;
        angle?: string;
        timepoint: string;
        description: string | null;
        consentForMarketing?: boolean;
        takenAt?: string;
    }>;
    procedure_record?: {
        id?: number;
        urgency: string;
        anesthesia_type: string | null;
        staff: Array<{
            id?: number;
            userId?: string;
            user: {
                id?: string;
                firstName: string;
                lastName: string;
                role: string;
            } | null;
            role: string;
        }>;
    };
}

// ── Case-centric plan response DTO (from GET /api/doctor/surgical-cases/[caseId]/plan) ──

export interface ReadinessChecklistItem {
    key: string;
    label: string;
    done: boolean;
}

export interface CasePlanDetailDto {
    // Surgical case
    id: string;
    status: string;
    urgency: string;
    diagnosis: string | null;
    procedureName: string | null;
    side: string | null;
    createdAt: string;
    updatedAt: string;

    // Patient
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        fileNumber: string | null;
        gender: string | null;
        dateOfBirth: string | null;
        allergies: string | null;
    } | null;

    // Surgeon
    primarySurgeon: { id: string; name: string } | null;

    // Consultation
    consultation: { id: number; appointmentId: number } | null;

    // Theater
    theaterBooking: {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
        theaterName: string | null;
    } | null;

    // Case plan data
    casePlan: {
        id: number;
        appointmentId: number;
        procedurePlan: string | null;
        riskFactors: string | null;
        preOpNotes: string | null;
        implantDetails: string | null;
        anesthesiaPlan: string | null;
        specialInstructions: string | null;
        estimatedDurationMinutes: number | null;
        readinessStatus: string;
        readyForSurgery: boolean;
        updatedAt: string;

        consents: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            signedAt: string | null;
            createdAt: string;
        }>;
        images: Array<{
            id: number;
            imageUrl: string;
            thumbnailUrl: string | null;
            angle: string;
            timepoint: string;
            description: string | null;
            consentForMarketing: boolean;
            takenAt: string;
        }>;
        procedureRecord: {
            id: number;
            anesthesiaType: string | null;
            urgency: string;
            staff: Array<{
                id: number;
                role: string;
                userId: string;
                user: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    role: string;
                } | null;
            }>;
        } | null;
    } | null;

    readinessChecklist: ReadinessChecklistItem[];
}

// ── API client methods ───────────────────────────────────────────────────

export const casePlanApi = {
    /** Legacy: create/update case plan by appointmentId */
    create: async (dto: CreateCasePlanDto): Promise<ApiResponse<CasePlanResponseDto>> => {
        return apiClient.post<CasePlanResponseDto>('/doctor/case-plans', dto);
    },

    /** Legacy: get plan by appointmentId */
    getByAppointmentId: async (appointmentId: number): Promise<ApiResponse<CasePlanResponseDto>> => {
        return apiClient.get<CasePlanResponseDto>(`/doctor/case-plans?appointmentId=${appointmentId}`);
    },

    // ── Case-centric (new) ────────────────────────────────────────────

    /** Get full case + plan data by surgical case ID */
    getByCaseId: async (caseId: string): Promise<ApiResponse<CasePlanDetailDto>> => {
        return apiClient.get<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`);
    },

    /** Partial-update plan fields by surgical case ID */
    updatePlan: async (
        caseId: string,
        data: Partial<{
            procedurePlan: string;
            riskFactors: string;
            preOpNotes: string;
            implantDetails: string;
            anesthesiaPlan: string;
            specialInstructions: string;
            estimatedDurationMinutes: number | null;
            readinessStatus: string;
        }>,
    ): Promise<ApiResponse<CasePlanDetailDto>> => {
        return apiClient.patch<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`, data);
    },

    /** Create a consent form for a case */
    createConsent: async (
        caseId: string,
        data: { type: string; title: string },
    ): Promise<ApiResponse<any>> => {
        return apiClient.post(`/doctor/surgical-cases/${caseId}/consents`, data);
    },

    /** Mark consent as signed */
    signConsent: async (
        consentId: string,
        data: { patientSignature: string; witnessName?: string },
    ): Promise<ApiResponse<any>> => {
        return apiClient.patch(`/doctor/consents/${consentId}`, { ...data, status: 'SIGNED' });
    },

    /** Add a photo to a case */
    addPhoto: async (
        caseId: string,
        data: { imageUrl: string; angle: string; timepoint?: string; description?: string; consentForMarketing?: boolean },
    ): Promise<ApiResponse<any>> => {
        return apiClient.post(`/doctor/surgical-cases/${caseId}/photos`, data);
    },

    // ── Team ──────────────────────────────────────────────────────────

    /** Initialize procedure record for a case */
    initProcedureRecord: async (caseId: string): Promise<ApiResponse<any>> => {
        return apiClient.post(`/doctor/surgical-cases/${caseId}/team`, { action: 'init' });
    },

    /** Assign a staff member to the case */
    assignStaff: async (
        caseId: string,
        data: { userId: string; role: string },
    ): Promise<ApiResponse<any>> => {
        return apiClient.post(`/doctor/surgical-cases/${caseId}/team`, { action: 'assign', ...data });
    },

    /** Remove a staff member from the case */
    removeStaff: async (caseId: string, staffId: number): Promise<ApiResponse<any>> => {
        return apiClient.post(`/doctor/surgical-cases/${caseId}/team`, { action: 'remove', staffId });
    },
};
