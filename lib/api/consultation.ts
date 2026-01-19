/**
 * Consultation API endpoints
 * 
 * Type-safe API client methods for consultation-related operations.
 * Designed for aesthetic surgery workflows.
 */

import { apiClient, ApiResponse } from './client';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';

/**
 * Consultation API client
 */
export const consultationApi = {
  /**
   * Get consultation by appointment ID
   * Returns null if consultation doesn't exist yet (not started)
   */
  async getConsultation(appointmentId: number): Promise<ApiResponse<ConsultationResponseDto | null>> {
    return apiClient.get<ConsultationResponseDto | null>(`/consultations/${appointmentId}`);
  },

  /**
   * Save consultation draft notes
   * Supports version safety (optimistic locking)
   */
  async saveDraft(
    appointmentId: number,
    dto: Omit<SaveConsultationDraftDto, 'appointmentId'>
  ): Promise<ApiResponse<ConsultationResponseDto>> {
    return apiClient.put<ConsultationResponseDto>(`/consultations/${appointmentId}/draft`, {
      ...dto,
      appointmentId,
    });
  },

  /**
   * Get patient consultation history
   * Optimized for timeline-based UI and fast doctor scanning
   */
  async getPatientConsultationHistory(patientId: string): Promise<ApiResponse<PatientConsultationHistoryDto>> {
    return apiClient.get<PatientConsultationHistoryDto>(`/patients/${patientId}/consultations`);
  },
};
