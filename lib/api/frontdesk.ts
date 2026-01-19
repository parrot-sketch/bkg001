/**
 * Frontdesk API endpoints
 * 
 * Type-safe API client methods for frontdesk-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { CreatePatientDto } from '../../application/dtos/CreatePatientDto';
import type { CheckInPatientDto } from '../../application/dtos/CheckInPatientDto';

/**
 * Frontdesk API client
 */
export const frontdeskApi = {
  /**
   * Get today's appointments (all patients)
   */
  async getTodayAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/today');
  },

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/upcoming');
  },

  /**
   * Get appointments by date
   */
  async getAppointmentsByDate(date: Date): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const dateStr = date.toISOString().split('T')[0];
    return apiClient.get<AppointmentResponseDto[]>(`/appointments/date/${dateStr}`);
  },

  /**
   * Get appointments by status
   */
  async getAppointmentsByStatus(status: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/appointments/status/${status}`);
  },

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: number): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.get<AppointmentResponseDto>(`/appointments/${appointmentId}`);
  },

  /**
   * Check in a patient for an appointment
   */
  async checkInPatient(appointmentId: number, userId: string): Promise<ApiResponse<AppointmentResponseDto>> {
    const dto: CheckInPatientDto = {
      appointmentId,
      userId,
    };
    return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/checkin`, dto);
  },

  /**
   * Create a new patient
   */
  async createPatient(dto: CreatePatientDto): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.post<PatientResponseDto>('/patients', dto);
  },

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
  },

  /**
   * Search patients by email or phone
   */
  async searchPatients(query: string): Promise<ApiResponse<PatientResponseDto[]>> {
    return apiClient.get<PatientResponseDto[]>(`/patients/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Get pending consultation requests (SUBMITTED, PENDING_REVIEW)
   */
  async getPendingConsultations(): Promise<ApiResponse<(AppointmentResponseDto & { daysSinceSubmission?: number })[]>> {
    return apiClient.get<(AppointmentResponseDto & { daysSinceSubmission?: number })[]>('/consultations/pending');
  },

  /**
   * Review consultation request (approve, request more info, or reject)
   */
  async reviewConsultation(
    appointmentId: number,
    action: 'approve' | 'needs_more_info' | 'reject',
    options?: {
      reviewNotes?: string;
      proposedDate?: Date;
      proposedTime?: string;
    }
  ): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>(`/consultations/${appointmentId}/review`, {
      action,
      reviewNotes: options?.reviewNotes,
      proposedDate: options?.proposedDate,
      proposedTime: options?.proposedTime,
    });
  },
};
