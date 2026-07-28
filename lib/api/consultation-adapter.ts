/**
 * Infrastructure Adapter — HttpConsultationApi
 *
 * HTTP implementation of the `ConsultationApi` port.
 *
 * Responsibilities:
 * - Translate `ConsultationOutcome<T>` requests into HTTP calls using the
 *   existing `consultationApi` concrete client.
 * - Map transport and HTTP failures to the `ClinicalError` taxonomy.
 * - Preserve authentication, retry, and cancellation semantics of the
 *   underlying `apiClient`.
 *
 * **Must NOT:**
 * - Expose HTTP details (URLs, status codes, headers) through the port.
 * - Introduce new network behavior (timeouts, retries) that diverges from
 *   the existing `apiClient`.
 */

import { ConsultationApi, ConsultationOutcome, ConsultationResponse, SaveConsultationDraftParams, PatientConsultationHistory } from '@/domain/interfaces/services/ConsultationApi';
import { ApiError, ApiClient } from '@/lib/api/client';
import { mapApiError, mapNetworkError } from '@/lib/api/adapter-utils';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
} from '@/shared-kernel/errors/codes';

const CONSULTATION_ERROR_CONFIG = {
  notFoundCode: ClinicalErrorCode.APPOINTMENT_NOT_FOUND,
  notFoundCategory: ClinicalErrorCategory.CONSULTATION,
};

export class HttpConsultationApi implements ConsultationApi {
  constructor(private readonly apiClient: ApiClient) {}

  async loadConsultation(appointmentId: number): Promise<ConsultationOutcome<ConsultationResponse | null>> {
    try {
      const response = await this.apiClient.get<ConsultationResponseDto | null>(`/appointments/${appointmentId}/consultation`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, CONSULTATION_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async saveConsultationDraft(
    appointmentId: number,
    dto: SaveConsultationDraftParams
  ): Promise<ConsultationOutcome<ConsultationResponse>> {
    try {
      const response = await this.apiClient.put<ConsultationResponse>(`/appointments/${appointmentId}/consultation/draft`, {
        appointmentId,
        ...dto,
      });
      if (!response.success) {
        return { success: false, error: mapApiError(response, CONSULTATION_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async loadPatientConsultationHistory(patientId: string): Promise<ConsultationOutcome<PatientConsultationHistory>> {
    try {
      const response = await this.apiClient.get<PatientConsultationHistory>(`/patients/${patientId}/consultations`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, CONSULTATION_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async sendHeartbeat(consultationId: number): Promise<ConsultationOutcome<void>> {
    try {
      await this.apiClient.post(`/consultations/${consultationId}/heartbeat`, {});
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }
}
