/**
 * Nurse API endpoints
 *
 * Type-safe API client methods for nurse-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { CheckInPatientDto } from '../../application/dtos/CheckInPatientDto';
import type { CaseReadinessStatus, SurgicalCaseStatus } from '@prisma/client';

/**
 * DTOs for nurse-specific operations
 * These would ideally come from application layer, but defined here for now
 */
export interface RecordVitalsDto {
  patientId: string;
  appointmentId?: number;
  bodyTemperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: string;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  recordedBy: string; // Nurse user ID
}

export interface AddCareNoteDto {
  patientId: string;
  appointmentId?: number;
  note: string;
  noteType: 'PRE_OP' | 'POST_OP' | 'GENERAL';
  recordedBy: string; // Nurse user ID
}

export interface UpdatePatientStatusDto {
  patientId: string;
  status: string;
  notes?: string;
  updatedBy: string; // Nurse user ID
}

/**
 * Pre-Op Surgical Case Response Types
 */
export interface PreOpCasePatient {
  id: string;
  fullName: string;
  fileNumber?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: Date;
}

export interface PreOpCaseSurgeon {
  id: string;
  name: string;
  specialty?: string;
}

export interface PreOpCasePlan {
  id: number;
  readinessStatus: CaseReadinessStatus;
  readyForSurgery: boolean;
  procedurePlan?: string;
  preOpNotes?: string;
  riskFactors?: string;
  implantDetails?: string;
  photosCount: number;
  consentsCount: number;
  signedConsentsCount: number;
}

export interface PreOpReadiness {
  intakeFormComplete: boolean;
  medicalHistoryComplete: boolean;
  photosUploaded: boolean;
  consentSigned: boolean;
  procedurePlanComplete: boolean;
  implantDetailsComplete: boolean;
  percentage: number;
  missingItems: string[];
  isReady: boolean;
}

export interface PreOpSurgicalCase {
  id: string;
  status: SurgicalCaseStatus;
  urgency: string;
  diagnosis?: string;
  procedureName?: string;
  createdAt: Date;
  patient: PreOpCasePatient | null;
  primarySurgeon: PreOpCaseSurgeon | null;
  casePlan: PreOpCasePlan | null;
  theaterBooking?: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
  };
  consultation?: {
    id: number;
    outcomeType?: string;
    patientDecision?: string;
    doctorNotes?: string;
    completedAt?: Date;
  };
  readiness: PreOpReadiness;
}

export interface PreOpCasesSummary {
  total: number;
  ready: number;
  pending: number;
  byStatus: {
    draft: number;
    planning: number;
  };
}

export interface PreOpCasesResponse {
  cases: PreOpSurgicalCase[];
  summary: PreOpCasesSummary;
}

export interface UpdatePreOpCaseDto {
  readinessStatus?: CaseReadinessStatus;
  surgicalCaseStatus?: SurgicalCaseStatus;
  casePlanUpdates?: {
    preOpNotes?: string;
    riskFactors?: string;
    procedurePlan?: string;
    implantDetails?: string;
    plannedAnesthesia?: string;
    specialInstructions?: string;
  };
}

/**
 * Nurse API client
 */
export const nurseApi = {
  /**
   * Get nurse's assigned patients (from appointments)
   */
  async getAssignedPatients(nurseId: string): Promise<ApiResponse<PatientResponseDto[]>> {
    // This would typically filter appointments by nurse assignment
    // For now, we'll use appointments API and extract patients
    return apiClient.get<PatientResponseDto[]>(`/nurses/${nurseId}/patients`);
  },

  /**
   * Get today's checked-in patients
   */
  async getTodayCheckedInPatients(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/today?status=SCHEDULED');
  },

  /**
   * Get patients requiring pre-op care
   */
  async getPreOpPatients(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/pre-op');
  },

  /**
   * Get patients requiring post-op care
   */
  async getPostOpPatients(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/post-op');
  },

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
  },

  /**
   * Record vitals for a patient
   */
  async recordVitals(dto: RecordVitalsDto): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/patients/vitals', dto);
  },

  /**
   * Add care note for a patient
   */
  async addCareNote(dto: AddCareNoteDto): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/patients/care-notes', dto);
  },

  /**
   * Update patient status
   */
  async updatePatientStatus(dto: UpdatePatientStatusDto): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.put<PatientResponseDto>(`/patients/${dto.patientId}/status`, dto);
  },

  /**
   * Get patient's medical records
   */
  async getPatientRecords(patientId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`/patients/${patientId}/records`);
  },

  // ============================================
  // Pre-Op Surgical Cases
  // ============================================

  /**
   * Get all surgical cases pending pre-op readiness work
   */
  async getPreOpSurgicalCases(filters?: {
    status?: string;
    readiness?: 'ready' | 'pending';
  }): Promise<ApiResponse<PreOpCasesResponse>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.readiness) params.append('readiness', filters.readiness);
    const queryString = params.toString();
    return apiClient.get<PreOpCasesResponse>(
      `/nurse/pre-op${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a single surgical case with full details
   */
  async getPreOpCaseDetails(caseId: string): Promise<ApiResponse<PreOpSurgicalCase>> {
    return apiClient.get<PreOpSurgicalCase>(`/nurse/pre-op/${caseId}`);
  },

  /**
   * Update a surgical case's pre-op status
   */
  async updatePreOpCase(
    caseId: string,
    updates: UpdatePreOpCaseDto
  ): Promise<ApiResponse<PreOpSurgicalCase>> {
    return apiClient.patch<PreOpSurgicalCase>(`/nurse/pre-op/${caseId}`, updates);
  },

  /**
   * Mark a surgical case as ready for scheduling
   */
  async markCaseReadyForScheduling(caseId: string): Promise<ApiResponse<PreOpSurgicalCase>> {
    return apiClient.patch<PreOpSurgicalCase>(`/nurse/pre-op/${caseId}`, {
      readinessStatus: 'READY',
      surgicalCaseStatus: 'READY_FOR_SCHEDULING',
    });
  },
};
