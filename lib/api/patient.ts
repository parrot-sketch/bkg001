/**
 * Patient API endpoints
 * 
 * Type-safe API client methods for patient-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { CreatePatientDto } from '../../application/dtos/CreatePatientDto';
import type { ScheduleAppointmentDto } from '../../application/dtos/ScheduleAppointmentDto';
import type { CheckInPatientDto } from '../../application/dtos/CheckInPatientDto';
import type { DoctorResponseDto } from '../../application/dtos/DoctorResponseDto';
import type { SubmitConsultationRequestDto } from '../../application/dtos/SubmitConsultationRequestDto';

/**
 * Patient API client
 */
export const patientApi = {
  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
  },

  /**
   * Create a new patient
   */
  async createPatient(dto: CreatePatientDto): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.post<PatientResponseDto>('/patients', dto);
  },

  /**
   * Update patient information
   */
  async updatePatient(
    patientId: string,
    dto: Partial<CreatePatientDto>,
  ): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.put<PatientResponseDto>(`/patients/${patientId}`, dto);
  },

  /**
   * Get patient's appointments (includes consultation_request_status)
   */
  async getAppointments(patientId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/appointments?patientId=${patientId}`);
  },

  /**
   * Confirm a scheduled consultation
   */
  async confirmConsultation(appointmentId: number): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>(`/consultations/${appointmentId}/confirm`);
  },

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(patientId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    // Get all appointments for the patient, then filter for upcoming on client side
    // This is more reliable than trying to filter by date on the server
    const response = await apiClient.get<AppointmentResponseDto[]>(
      `/appointments?patientId=${patientId}`
    );
    
    if (response.success && response.data) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter for upcoming: PENDING or SCHEDULED status AND appointment_date >= today
      const upcoming = response.data.filter((apt) => {
        const appointmentDate = new Date(apt.appointmentDate);
        appointmentDate.setHours(0, 0, 0, 0);
        const isUpcoming = appointmentDate >= today;
        const isPendingOrScheduled = apt.status === 'PENDING' || apt.status === 'SCHEDULED';
        return isUpcoming && isPendingOrScheduled;
      });
      
      return {
        success: true,
        data: upcoming,
      };
    }
    
    return response;
  },

  /**
   * Get appointment history
   */
  async getAppointmentHistory(patientId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>(`/patients/${patientId}/appointments/history`);
  },

  /**
   * Schedule a new appointment
   */
  async scheduleAppointment(dto: ScheduleAppointmentDto): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>('/appointments', dto);
  },

  /**
   * Check in for an appointment
   */
  async checkIn(dto: CheckInPatientDto): Promise<ApiResponse<AppointmentResponseDto>> {
    const { appointmentId } = dto;
    return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/checkin`, dto);
  },

  /**
   * Get all doctors (for appointment scheduling)
   */
  async getAllDoctors(): Promise<ApiResponse<DoctorResponseDto[]>> {
    return apiClient.get<DoctorResponseDto[]>('/doctors');
  },

  /**
   * Submit a consultation request
   */
  async submitConsultationRequest(dto: SubmitConsultationRequestDto): Promise<ApiResponse<AppointmentResponseDto>> {
    return apiClient.post<AppointmentResponseDto>('/consultations/submit', dto);
  },
};
