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
   * Get doctor's appointments (only SCHEDULED/CONFIRMED consultations by default)
   * 
   * @param doctorId - Doctor ID
   * @param statusFilter - Optional: filter by consultation request status (comma-separated)
   *                      Default: SCHEDULED,CONFIRMED (only approved consultations)
   */
  async getAppointments(
    doctorId: string,
    statusFilter?: string
  ): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const statusParam = statusFilter || 'SCHEDULED,CONFIRMED';
    return apiClient.get<AppointmentResponseDto[]>(
      `/appointments/doctor/${doctorId}?status=${statusParam}`
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
};
