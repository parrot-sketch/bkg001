/**
 * Admin API endpoints
 * 
 * Type-safe API client methods for admin-related operations.
 */

import { apiClient, ApiResponse } from './client';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { RegisterUserDto } from '../../application/dtos/RegisterUserDto';
import type { UserResponseDto } from '../../application/dtos/UserResponseDto';
import type { InviteDoctorDto, InviteDoctorResponseDto } from '../../application/dtos/InviteDoctorDto';
import { Role } from '../../domain/enums/Role';
import { Status } from '../../domain/enums/Status';

/**
 * DTOs for admin-specific operations
 */
export interface ApprovePatientDto {
  patientId: string;
  approvedBy: string; // Admin user ID
  notes?: string;
}

export interface UpdateUserStatusDto {
  userId: string;
  status: Status;
  updatedBy: string; // Admin user ID
}

export interface AssignPatientDto {
  patientId: string;
  assignedToUserId: string;
  assignedBy: string; // Admin user ID
  notes?: string;
}

export interface GenerateReportDto {
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate?: Date;
  endDate?: Date;
  includePatients?: boolean;
  includeStaff?: boolean;
  includeAppointments?: boolean;
}

/**
 * Admin API client
 */
export const adminApi = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<{
    totalPatients: number;
    totalStaff: number;
    totalDoctors: number;
    totalNurses: number;
    totalFrontdesk: number;
    appointmentsToday: number;
    appointmentsUpcoming: number;
    pendingPreOp: number;
    pendingPostOp: number;
    pendingApprovals: number;
  }>> {
    return apiClient.get('/admin/dashboard/stats');
  },

  /**
   * Get all patients
   */
  async getAllPatients(): Promise<ApiResponse<PatientResponseDto[]>> {
    return apiClient.get<PatientResponseDto[]>('/admin/patients');
  },

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.get<PatientResponseDto>(`/admin/patients/${patientId}`);
  },

  /**
   * Approve patient registration
   */
  async approvePatient(dto: ApprovePatientDto): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.post<PatientResponseDto>(`/admin/patients/${dto.patientId}/approve`, dto);
  },

  /**
   * Reject patient registration
   */
  async rejectPatient(patientId: string, reason: string, rejectedBy: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/admin/patients/${patientId}/reject`, { reason, rejectedBy });
  },

  /**
   * Assign patient to staff
   */
  async assignPatient(dto: AssignPatientDto): Promise<ApiResponse<PatientResponseDto>> {
    return apiClient.post<PatientResponseDto>(`/admin/patients/${dto.patientId}/assign`, dto);
  },

  /**
   * Get all staff
   */
  async getAllStaff(): Promise<ApiResponse<UserResponseDto[]>> {
    return apiClient.get<UserResponseDto[]>('/admin/staff');
  },

  /**
   * Get staff by role
   */
  async getStaffByRole(role: Role): Promise<ApiResponse<UserResponseDto[]>> {
    return apiClient.get<UserResponseDto[]>(`/admin/staff?role=${role}`);
  },

  /**
   * Create new staff member
   */
  async createStaff(dto: RegisterUserDto): Promise<ApiResponse<UserResponseDto>> {
    return apiClient.post<UserResponseDto>('/admin/staff', dto);
  },

  /**
   * Update staff member
   */
  async updateStaff(userId: string, updates: Partial<RegisterUserDto>): Promise<ApiResponse<UserResponseDto>> {
    return apiClient.put<UserResponseDto>(`/admin/staff/${userId}`, updates);
  },

  /**
   * Update staff status (activate/deactivate)
   */
  async updateStaffStatus(dto: UpdateUserStatusDto): Promise<ApiResponse<UserResponseDto>> {
    return apiClient.put<UserResponseDto>(`/admin/staff/${dto.userId}/status`, dto);
  },

  /**
   * Get all appointments
   */
  async getAllAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/admin/appointments');
  },

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<ApiResponse<AppointmentResponseDto[]>> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return apiClient.get<AppointmentResponseDto[]>(`/admin/appointments?startDate=${start}&endDate=${end}`);
  },

  /**
   * Get pre-op patients overview
   */
  async getPreOpOverview(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/admin/appointments/pre-op');
  },

  /**
   * Get post-op patients overview
   */
  async getPostOpOverview(): Promise<ApiResponse<AppointmentResponseDto[]>> {
    return apiClient.get<AppointmentResponseDto[]>('/admin/appointments/post-op');
  },

  /**
   * Generate report
   */
  async generateReport(dto: GenerateReportDto): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/admin/reports/generate', dto);
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(limit?: number, offset?: number): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiClient.get<any[]>(`/admin/audit-logs?${params.toString()}`);
  },

  /**
   * Get daily appointment trends
   */
  async getAppointmentTrends(days: number = 30): Promise<ApiResponse<{ date: string; count: number }[]>> {
    return apiClient.get(`/admin/analytics/appointments/trends?days=${days}`);
  },

  /**
   * Get patient intake statistics
   */
  async getPatientIntakeStats(days: number = 30): Promise<ApiResponse<{ date: string; count: number }[]>> {
    return apiClient.get(`/admin/analytics/patients/intake?days=${days}`);
  },

  /**
   * Invite a doctor to the system
   */
  async inviteDoctor(dto: InviteDoctorDto): Promise<ApiResponse<InviteDoctorResponseDto>> {
    return apiClient.post<InviteDoctorResponseDto>('/admin/invite-doctor', dto);
  },
};
