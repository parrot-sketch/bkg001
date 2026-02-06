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
import type { DoctorAvailabilityResponseDto } from '../../application/dtos/DoctorAvailabilityResponseDto';
import type { CreateConsultationFromFrontdeskDto } from '../../application/dtos/CreateConsultationFromFrontdeskDto';

/**
 * Frontdesk API client
 */
export const frontdeskApi = {
  /**
   * Get today's appointments (all patients)
   * Optional: Filter by doctor ID
   */
  async getTodaysSchedule(doctorId?: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    let url = '/frontdesk/schedule/today';
    if (doctorId) {
      url += `?doctorId=${doctorId}`;
    }
    return apiClient.get<AppointmentResponseDto[]>(url);
  },

  /**
   * Get today's appointments (Legacy - can be deprecated or mapped to above)
   */
  async getTodayAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments/today');
  },

  /**
   * Get upcoming appointments (future dates)
   */
  async getUpcomingAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/appointments?upcoming=true');
  },

  /**
   * Get appointments by date
   * 
   * @param date - Date to filter appointments (will filter for that specific day)
   */
  async getAppointmentsByDate(date: Date): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    return apiClient.get<AppointmentResponseDto[]>(`/appointments?date=${dateStr}`);
  },

  /**
   * Get appointments by status
   * 
   * @param status - Appointment status to filter by
   */
  async getAppointmentsByStatus(status: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/appointments?status=${encodeURIComponent(status)}`);
  },

  /**
   * Get appointments by date range
   * 
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   */
  async getAppointmentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    return apiClient.get<AppointmentResponseDto[]>(`/appointments?startDate=${startStr}&endDate=${endStr}`);
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
  async checkInPatient(appointmentId: number, options?: { userId?: string, notes?: string }): Promise<ApiResponse<AppointmentResponseDto>> {
    const dto: any = { // Using any as DTO interface might be strict on userId but API route handles it
      appointmentId,
      userId: options?.userId || '', // Backend extracts real userId from token
      notes: options?.notes,
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
   * Get patients with pagination and search
   * 
   * @param params - Pagination and search params
   */
  async getPatients(params: { page: number; limit: number; q?: string }): Promise<ApiResponse<PatientResponseDto[]>> {
    const query = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
    });
    if (params.q) query.append('q', params.q);

    return apiClient.get<PatientResponseDto[]>(`/frontdesk/patients?${query.toString()}`);
  },


  /**
   * Get pending consultation requests (SUBMITTED, PENDING_REVIEW)
   */
  async getPendingConsultations(): Promise<ApiResponse<(AppointmentResponseDto & { daysSinceSubmission?: number })[]>> {
    return apiClient.get<(AppointmentResponseDto & { daysSinceSubmission?: number })[]>('/consultations/pending');
  },

  /**
   * Get consultations by consultation request status
   * 
   * @param statuses - Array of consultation request statuses to filter by
   */
  async getConsultationsByStatus(statuses: string[]): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('consultationRequestStatus', statuses.join(','));
    return apiClient.get<AppointmentResponseDto[]>(`/appointments?${queryParams.toString()}`);
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

  /**
   * Get all doctors' availability for a date range
   * Used by front desk to view availability when scheduling appointments
   * 
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param specialization - Optional specialization filter
   */
  async getDoctorsAvailability(
    startDate: Date,
    endDate: Date,
    specialization?: string
  ): Promise<ApiResponse<DoctorAvailabilityResponseDto[]>> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const params = new URLSearchParams({
      startDate: startStr,
      endDate: endStr,
    });
    if (specialization) {
      params.append('specialization', specialization);
    }
    return apiClient.get<DoctorAvailabilityResponseDto[]>(`/doctors/availability?${params.toString()}`);
  },

  /**
   * Schedule an appointment (for self or on behalf of patient)
   */
  async scheduleAppointment(dto: import('../../application/dtos/ScheduleAppointmentDto').ScheduleAppointmentDto): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>('/appointments', dto);
  },

  /**
   * Create a consultation request (Frontdesk only)
   */
  async createConsultation(dto: CreateConsultationFromFrontdeskDto): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>('/consultations/frontdesk/create', dto);
  },

  /**
   * Resolve a stale/overdue appointment (mark as completed or cancel)
   */
  async resolveStaleAppointment(
    appointmentId: number, 
    action: 'complete' | 'cancel'
  ): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/resolve`, { action });
  },
};
