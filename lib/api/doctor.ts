/**
 * Doctor API endpoints
 * 
 * Type-safe API client methods for doctor-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { StartConsultationDto } from '../../application/dtos/StartConsultationDto';
import type { CompleteConsultationDto } from '../../application/dtos/CompleteConsultationDto';
import type { CheckInPatientDto } from '../../application/dtos/CheckInPatientDto';
import type { DoctorResponseDto } from '../../application/dtos/DoctorResponseDto';
import type { ConfirmAppointmentDto } from '../../application/dtos/ConfirmAppointmentDto';

/**
 * Doctor API client
 */
export const doctorApi = {
  /**
   * Get all doctors (for selection/directory)
   */
  async getAllDoctors(): Promise<ApiResponse<DoctorResponseDto[]>> {
    return apiClient.get<DoctorResponseDto[]>('/doctors');
  },

  /**
   * Get doctor by ID
   */
  async getDoctor(doctorId: string): Promise<ApiResponse<DoctorResponseDto>> {
    return apiClient.get<DoctorResponseDto>(`/doctors/${doctorId}`);
  },

  /**
   * Get doctor by user ID
   */
  async getDoctorByUserId(userId: string): Promise<ApiResponse<DoctorResponseDto & { workingDays?: any[] }>> {
    return apiClient.get<DoctorResponseDto & { workingDays?: any[] }>(`/doctors/user/${userId}`);
  },

  /**
   * Get doctor's appointments (only SCHEDULED/CONFIRMED consultations by default)
   * 
   * @param doctorId - Doctor ID
   * @param statusFilter - Optional: filter by consultation request status (comma-separated)
   *                      Default: SCHEDULED,CONFIRMED (only approved consultations)
   */
  async getAppointments(
    doctorId: string,
    statusFilter?: string,
    includeAll?: boolean
  ): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const statusParam = statusFilter || 'SCHEDULED,CONFIRMED';
    const includeAllParam = includeAll ? '&includeAll=true' : '';
    return apiClient.get<AppointmentResponseDto[]>(
      `/appointments/doctor/${doctorId}?status=${statusParam}${includeAllParam}`
    );
  },

  /**
   * Get doctor's upcoming appointments
   */
  async getUpcomingAppointments(doctorId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/doctors/${doctorId}/appointments/upcoming`);
  },

  /**
   * Get today's appointments
   */
  async getTodayAppointments(doctorId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/doctors/${doctorId}/appointments/today`);
  },

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: number): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.get<AppointmentResponseDto>(`/appointments/${appointmentId}`);
  },

  /**
   * Start a consultation
   */
  async startConsultation(dto: StartConsultationDto): Promise<ApiResponse<AppointmentResponseDto>> {
    const { appointmentId } = dto;
    return apiClient.post<AppointmentResponseDto>(`/consultations/${appointmentId}/start`, dto);
  },

  /**
   * Complete a consultation
   */
  async completeConsultation(dto: CompleteConsultationDto): Promise<ApiResponse<AppointmentResponseDto>> {
    const { appointmentId } = dto;
    return apiClient.post<AppointmentResponseDto>(`/consultations/${appointmentId}/complete`, dto);
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
   * Get patient information
   */
  async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
  },

  /**
   * Get patient's appointments (for viewing patient history)
   */
  async getPatientAppointments(patientId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/patients/${patientId}/appointments`);
  },

  /**
   * Update doctor's own profile
   */
  async updateProfile(dto: {
    bio?: string;
    education?: string;
    focusAreas?: string;
    professionalAffiliations?: string;
    profileImage?: string;
    clinicLocation?: string;
  }): Promise<ApiResponse<DoctorResponseDto>> {
    return apiClient.put<DoctorResponseDto>('/doctors/me/profile', dto);
  },

  /**
   * Get doctor's own availability
   */
  async getMyAvailability(): Promise<ApiResponse<any>> {
    return apiClient.get('/doctors/me/availability');
  },

  /**
   * Set doctor's own availability
   */
  async setMyAvailability(dto: {
    workingDays: Array<{
      day: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      breaks?: Array<{
        startTime: string;
        endTime: string;
        reason?: string;
      }>;
      sessions?: Array<{
        startTime: string;
        endTime: string;
        sessionType?: string;
        maxPatients?: number;
        notes?: string;
      }>;
    }>;
    slotConfiguration?: {
      defaultDuration: number;
      bufferTime: number;
      slotInterval: number;
    };
  }): Promise<ApiResponse<any>> {
    return apiClient.put('/doctors/me/availability', dto);
  },

  /**
   * Create availability override (block date or set custom hours)
   */
  async createOverride(dto: {
    startDate: Date;
    endDate: Date;
    isBlocked: boolean;
    reason?: string;
    startTime?: string; // HH:mm - custom start time (only for single-day overrides)
    endTime?: string;   // HH:mm - custom end time (only for single-day overrides)
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/doctors/me/availability/overrides', dto);
  },

  /**
   * Delete availability override
   */
  async deleteOverride(overrideId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/doctors/me/availability/overrides/${overrideId}`);
  },

  /**
   * Get schedule blocks
   */
  async getScheduleBlocks(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    const query = params.toString();
    return apiClient.get<any[]>(`/doctors/me/schedule/blocks${query ? `?${query}` : ''}`);
  },

  /**
   * Create schedule block
   */
  async createScheduleBlock(dto: {
    startDate: Date;
    endDate: Date;
    startTime?: string;
    endTime?: string;
    blockType: string;
    reason?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/doctors/me/schedule/block', dto);
  },

  /**
   * Delete schedule block
   */
  async deleteScheduleBlock(blockId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/doctors/me/schedule/block/${blockId}`);
  },

  /**
   * Get theater schedule with CasePlan data
   */
  async getTheatreSchedule(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    const query = params.toString();
    return apiClient.get<any[]>(`/doctors/me/theatre-schedule${query ? `?${query}` : ''}`);
  },

  /**
   * Confirm or reject an appointment pending doctor confirmation
   * 
   * Doctor calls this to confirm (accept) or reject (cancel) an appointment
   * that was scheduled by frontdesk and is awaiting doctor confirmation.
   * 
   * @param appointmentId - Appointment ID to confirm/reject
   * @param action - 'confirm' to accept, 'reject' to cancel
   * @param rejectionReason - Required if action is 'reject'
   * @param notes - Optional notes from doctor
   */
  async confirmAppointment(
    appointmentId: number,
    action: 'confirm' | 'reject',
    options?: {
      rejectionReason?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<AppointmentResponseDto>> {
    const dto: ConfirmAppointmentDto = {
      appointmentId,
      action,
      rejectionReason: options?.rejectionReason,
      notes: options?.notes,
    };
    return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/confirm`, dto);
  },

  /**
   * Schedule an appointment
   */
  async scheduleAppointment(dto: import('../../application/dtos/ScheduleAppointmentDto').ScheduleAppointmentDto): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>('/appointments', dto);
  },

  /**
   * Get doctor's patients
   * 
   * Fetches unique patients who have had appointments with this doctor.
   * Optimized to avoid N+1 queries.
   */
  async getMyPatients(): Promise<ApiResponse<PatientResponseDto[]>> {
    return apiClient.get<PatientResponseDto[]>('/doctors/me/patients');
  },
};
