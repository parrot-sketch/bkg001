import { apiClient, ApiResponse } from './client';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

export interface CasePlanResponseDto {
    id: number;
    appointmentId: number;
    patientId: string;
    doctorId: string;
    procedurePlan: string | null;
    riskFactors?: string | null;
    preOpNotes?: string | null;
    implantDetails?: string | null;
    anesthesiaPlan?: string | null;
    specialInstructions?: string | null;
    readinessStatus: string;
    createdAt: string;
    updatedAt: string;

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
        timepoint: string;
        description: string;
    }>;
    procedure_record?: {
        urgency: string;
        anesthesia_type: string;
        staff: Array<{
            user: {
                firstName: string;
                lastName: string;
                role: string;
            };
            role: string;
        }>;
    };
}

export const casePlanApi = {
    create: async (dto: CreateCasePlanDto): Promise<ApiResponse<CasePlanResponseDto>> => {
        return apiClient.post<CasePlanResponseDto>('/doctor/case-plans', dto);
    },

    getByAppointmentId: async (appointmentId: number): Promise<ApiResponse<CasePlanResponseDto>> => {
        return apiClient.get<CasePlanResponseDto>(`/doctor/case-plans?appointmentId=${appointmentId}`);
    },
};
