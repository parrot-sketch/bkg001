/**
 * Infrastructure Adapter — HttpDoctorApi
 *
 * HTTP implementation of the `DoctorApi` port.
 *
 * Responsibilities:
 * - Translate `DoctorOutcome<T>` requests into HTTP calls using the
 *   existing `doctorApi` concrete client.
 * - Map transport and HTTP failures to the `ClinicalError` taxonomy.
 * - Preserve authentication, retry, and cancellation semantics of the
 *   underlying `apiClient`.
 *
 * **Must NOT:**
 * - Expose HTTP details (URLs, status codes, headers) through the port.
 * - Introduce new network behavior that diverges from the existing `apiClient`.
 */

import { DoctorApi, DoctorOutcome, DoctorResponse, VitalsResponse, StartConsultationParams, CompleteConsultationParams } from '@/domain/interfaces/services/DoctorApi';
import type { AppointmentResponse } from '@/domain/interfaces/services/PatientApi';
import type { PatientResponse } from '@/domain/interfaces/services/PatientApi';
import { ApiClient } from '@/lib/api/client';
import { mapApiError, mapNetworkError } from '@/lib/api/adapter-utils';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
} from '@/shared-kernel/errors/codes';

const DOCTOR_ERROR_CONFIG = {
  notFoundCode: ClinicalErrorCode.APPOINTMENT_NOT_FOUND,
  notFoundCategory: ClinicalErrorCategory.CONSULTATION,
};

export class HttpDoctorApi implements DoctorApi {
  constructor(private readonly apiClient: ApiClient) {}

  async getAppointment(appointmentId: number): Promise<DoctorOutcome<AppointmentResponse>> {
    try {
      const response = await this.apiClient.get<AppointmentResponseDto>(`/appointments/${appointmentId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as AppointmentResponse };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async getDoctorByUserId(userId: string): Promise<DoctorOutcome<DoctorResponse>> {
    try {
      const response = await this.apiClient.get<DoctorResponseDto>(`/doctors/by-user/${userId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as DoctorResponse };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async getPatient(patientId: string): Promise<DoctorOutcome<PatientResponse>> {
    try {
      const response = await this.apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as PatientResponse };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async getPatientVitals(patientId: string, appointmentId: number): Promise<DoctorOutcome<VitalsResponse[]>> {
    try {
      const response = await this.apiClient.get<any[]>(`/patients/${patientId}/vitals?appointmentId=${appointmentId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as VitalsResponse[] };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async startConsultation(dto: StartConsultationParams): Promise<DoctorOutcome<AppointmentResponse>> {
    try {
      const response = await this.apiClient.post<AppointmentResponseDto>(`/consultations/${dto.appointmentId}/start`, dto);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as AppointmentResponse };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async completeConsultation(dto: CompleteConsultationParams): Promise<DoctorOutcome<AppointmentResponse>> {
    try {
      const response = await this.apiClient.post<AppointmentResponseDto>(`/consultations/${dto.appointmentId}/complete`, dto);
      if (!response.success) {
        return { success: false, error: mapApiError(response, DOCTOR_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as AppointmentResponse };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }
}
