/**
 * Nurse API endpoints
 * 
 * Type-safe API client methods for nurse-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { CheckInPatientDto } from '../../application/dtos/CheckInPatientDto';

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
};
