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
import { consultationApi } from '@/lib/api/consultation';
import { ApiError } from '@/lib/api/client';
import { mapApiError, mapNetworkError } from '@/lib/api/adapter-utils';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
} from '@/shared-kernel/errors/codes';

const CONSULTATION_ERROR_CONFIG = {
  notFoundCode: ClinicalErrorCode.APPOINTMENT_NOT_FOUND,
  notFoundCategory: ClinicalErrorCategory.CONSULTATION,
};

export class HttpConsultationApi implements ConsultationApi {
  async loadConsultation(appointmentId: number): Promise<ConsultationOutcome<ConsultationResponse | null>> {
    try {
      const response = await consultationApi.getConsultation(appointmentId);
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
      const response = await consultationApi.saveDraft(appointmentId, dto);
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
      const response = await consultationApi.getPatientConsultationHistory(patientId);
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
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.post(`/consultations/${consultationId}/heartbeat`, {});
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }
}
