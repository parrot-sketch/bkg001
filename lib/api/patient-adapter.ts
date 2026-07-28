/**
 * Infrastructure Adapter — HttpPatientApi
 *
 * HTTP implementation of the `PatientApi` port.
 *
 * Responsibilities:
 * - Translate `PatientOutcome<T>` requests into HTTP calls using the
 *   existing `patientApi` concrete client.
 * - Map transport and HTTP failures to the `ClinicalError` taxonomy.
 * - Preserve authentication, retry, and cancellation semantics of the
 *   underlying `apiClient`.
 *
 * **Must NOT:**
 * - Expose HTTP details (URLs, status codes, headers) through the port.
 * - Introduce new network behavior (timeouts, retries) that diverges from
 *   the existing `apiClient`.
 */

import { PatientApi, PatientOutcome, PatientResponse, AppointmentResponse, VitalsResponse } from '@/domain/interfaces/services/PatientApi';
import { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import { mapApiError, mapNetworkError } from '@/lib/api/adapter-utils';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CreatePatientDto } from '@/application/dtos/CreatePatientDto';
import type { ScheduleAppointmentDto } from '@/application/dtos/ScheduleAppointmentDto';
import type { CheckInPatientDto } from '@/application/dtos/CheckInPatientDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { SubmitConsultationRequestDto } from '@/application/dtos/SubmitConsultationRequestDto';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
} from '@/shared-kernel/errors/codes';

const PATIENT_ERROR_CONFIG = {
  notFoundCode: ClinicalErrorCode.PATIENT_NOT_FOUND,
  notFoundCategory: ClinicalErrorCategory.PATIENT,
};

export class HttpPatientApi implements PatientApi {
  constructor(private readonly apiClient: ApiClient) {}

  async loadPatient(patientId: string): Promise<PatientOutcome<PatientResponse>> {
    try {
      const response = await this.apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, PATIENT_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async loadPatientAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>> {
    try {
      const response = await this.apiClient.get<AppointmentResponseDto[]>(`/appointments?patientId=${patientId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, PATIENT_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async loadUpcomingAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>> {
    try {
      const response = await this.apiClient.get<AppointmentResponseDto[]>(`/appointments?patientId=${patientId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, PATIENT_ERROR_CONFIG) };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = response.data?.filter((apt) => {
        const appointmentDate = new Date(apt.appointmentDate);
        appointmentDate.setHours(0, 0, 0, 0);
        const isUpcoming = appointmentDate >= today;
        const isPendingOrScheduled = apt.status === 'PENDING' || apt.status === 'SCHEDULED';
        return isUpcoming && isPendingOrScheduled;
      }) ?? [];
      
      return {
        success: true,
        data: upcoming,
      };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }

  async getPatientVitals(patientId: string, appointmentId: number): Promise<PatientOutcome<VitalsResponse[]>> {
    try {
      const response = await this.apiClient.get<any[]>(`/patients/${patientId}/vitals?appointmentId=${appointmentId}`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, PATIENT_ERROR_CONFIG) };
      }
      return { success: true, data: response.data as VitalsResponse[] };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }
}
