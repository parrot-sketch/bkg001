/**
 * Frontdesk API Client
 *
 * API methods for frontdesk operations including theater scheduling.
 */

import { apiClient, ApiResponse } from './client';
import { getLocalDateString } from '@/lib/utils/dates';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

export interface TheaterSchedulingCase {
    id: string;
    status: string;
    patient: {
        id: string;
        name: string;
        fileNumber: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
    } | null;
    surgeon: {
        id: string;
        name: string;
        specialization: string | null;
    } | null;
    procedure: string;
    urgency: string;
    preOpChecklistFinalized: boolean;
    preOpChecklistFinalizedAt: Date | null;
    existingBooking: {
        id: string;
        theaterId: string;
        startTime: Date;
        endTime: Date;
        status: string;
    } | null;
    createdAt: Date;
}

export interface TheaterSchedulingResponse {
    cases: TheaterSchedulingCase[];
    count: number;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

export interface Theater {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    bookings: TheaterBooking[];
}

export interface TheaterBooking {
    id: string;
    caseId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    lockedBy: string | null;
    lockedAt: Date | null;
    lockExpiresAt: Date | null;
}

export interface TheatersResponse {
    theaters: Theater[];
    date: string;
}

export interface BookTheaterRequest {
    theaterId: string;
    startTime: string; // ISO datetime string
    endTime: string; // ISO datetime string
}

export interface BookTheaterResponse {
    bookingId: string;
    status: string;
    theaterId: string;
    startTime: Date;
    endTime: Date;
    lockedAt: Date | null;
    lockExpiresAt: Date | null;
}

export interface ConfirmBookingRequest {
    bookingId: string;
}

export interface ConfirmBookingResponse {
    bookingId: string;
    status: string;
    theaterId: string;
    startTime: Date;
    endTime: Date;
    confirmedAt: Date | null;
    caseStatus: string;
}

export interface ScheduleProcedureRequest {
    patientId: string;
    procedureName: string;
    procedureDate: string;
    primarySurgeonDoctorId?: string;
    primarySurgeonName?: string;
    diagnosis?: string;
    procedureCategory?: string;
    primaryOrRevision?: string;
    admissionType?: string;
    appointmentId?: number;
}

export interface ScheduleProcedureResponse {
    surgicalCaseId: string;
    status: string;
    patientName: string;
}

export interface ProcedureOption {
    id: string;
    category: string;
    subcategory: string | null;
    name: string;
    description: string | null;
    is_active: boolean;
    estimated_duration_minutes: number | null;
    default_price: number | null;
}

export interface FrontdeskSurgicalCaseListItem {
    id: string;
    status: string;
    procedure_name: string;
    procedure_date: string | null;
    diagnosis: string | null;
    procedure_category: string | null;
    primary_or_revision: string | null;
    admission_type: string | null;
    created_at: string;
    urgency?: string | null;
    case_procedures?: Array<{
        id: string;
        procedure: {
            id: number;
            name: string;
            category: string | null;
            subcategory?: string | null;
            estimated_duration_minutes?: number | null;
        };
    }>;
    case_plan?: {
        readiness_status?: string | null;
        ready_for_surgery?: boolean;
        estimated_duration_minutes?: number | null;
    } | null;
    theater_booking?: {
        id: string;
        startTime?: string;
        endTime?: string;
        status?: string;
        theater?: {
            name: string;
        };
    } | null;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        file_number: string | null;
        email?: string | null;
        phone?: string | null;
    };
    primary_surgeon: {
        id: string;
        name: string;
        specialization: string | null;
    } | null;
    primary_surgeon_name: string | null;
}

export interface FrontdeskSurgicalCasesListResponse {
    data: FrontdeskSurgicalCaseListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UpdateFrontdeskSurgicalCaseRequest {
  procedureName?: string;
  procedureDate?: string;
  primarySurgeonDoctorId?: string;
  primarySurgeonName?: string;
  diagnosis?: string | null;
  procedureCategory?: string | null;
  primaryOrRevision?: string | null;
  admissionType?: string | null;
  status?: string;
}

export const frontdeskApi = {
    /**
     * Get surgical cases ready for theater booking with pagination
     */
    async getTheaterSchedulingQueue(page?: number, limit?: number): Promise<{ success: boolean; data?: TheaterSchedulingResponse; error?: string }> {
        const params = new URLSearchParams();
        if (page) params.set('page', page.toString());
        if (limit) params.set('limit', limit.toString());
        const queryString = params.toString();
        const url = queryString ? `/frontdesk/theater-scheduling?${queryString}` : '/frontdesk/theater-scheduling';
        return apiClient.get<TheaterSchedulingResponse>(url);
    },

    /**
     * Get available theaters with bookings for a date
     */
    async getTheaters(date?: string): Promise<{ success: boolean; data?: TheatersResponse; error?: string }> {
        const url = date ? `/frontdesk/theater-scheduling/theaters?date=${date}` : '/frontdesk/theater-scheduling/theaters';
        return apiClient.get<TheatersResponse>(url);
    },

    /**
     * Lock a theater slot (provisional booking)
     */
    async bookTheater(caseId: string, request: BookTheaterRequest): Promise<{ success: boolean; data?: BookTheaterResponse; error?: string }> {
        return apiClient.post<BookTheaterResponse>(`/frontdesk/theater-scheduling/${caseId}/book`, request);
    },

    /**
     * Confirm a provisional theater booking
     */
    async confirmBooking(caseId: string, request: ConfirmBookingRequest): Promise<{ success: boolean; data?: ConfirmBookingResponse; error?: string }> {
        return apiClient.post<ConfirmBookingResponse>(`/frontdesk/theater-scheduling/${caseId}/confirm`, request);
    },

    /**
     * Schedule a new surgical case from frontdesk
     */
    async scheduleSurgicalCase(dto: ScheduleProcedureRequest): Promise<{ success: boolean; data?: ScheduleProcedureResponse; error?: string }> {
        return apiClient.post<ScheduleProcedureResponse>('/frontdesk/surgical-cases', dto);
    },

    /**
     * Get all procedure options, optionally filtered by category
     */
    async getProcedureOptions(params?: { category?: string; search?: string }): Promise<ApiResponse<ProcedureOption[]>> {
        const queryParams = new URLSearchParams();
        if (params?.category) queryParams.set('category', params.category);
        if (params?.search) queryParams.set('search', params.search);
        const queryString = queryParams.toString();
        const url = queryString ? `/admin/procedure-options?${queryString}` : '/admin/procedure-options';
        return apiClient.get<any[]>(url);
    },

    /**
     * Create a new procedure option (admin/frontdesk only)
     */
    async createProcedureOption(dto: { name: string; category: string; subcategory?: string; description?: string; estimated_duration_minutes?: number; default_price?: number }): Promise<ApiResponse<ProcedureOption>> {
        return apiClient.post<ProcedureOption>('/admin/procedure-options', dto);
    },

    /**
     * Get a single surgical case by ID
     */
    async getSurgicalCase(caseId: string): Promise<ApiResponse<any>> {
        return apiClient.get<any>(`/frontdesk/surgical-cases/${caseId}`);
    },

    /**
     * Get surgical cases list for frontdesk
     */
    async getSurgicalCases(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<ApiResponse<FrontdeskSurgicalCasesListResponse>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.status) queryParams.set('status', params.status);
        if (params?.search) queryParams.set('search', params.search);
        const queryString = queryParams.toString();
        const url = queryString ? `/frontdesk/surgical-cases?${queryString}` : '/frontdesk/surgical-cases';
        return apiClient.get<FrontdeskSurgicalCasesListResponse>(url);
    },

    /**
     * Update a surgical case from frontdesk
     */
    async updateSurgicalCase(caseId: string, dto: UpdateFrontdeskSurgicalCaseRequest): Promise<ApiResponse<any>> {
        return apiClient.patch(`/frontdesk/surgical-cases/${caseId}`, dto);
    },

    /**
     * Delete a surgical case from frontdesk
     */
    async deleteSurgicalCase(caseId: string): Promise<ApiResponse<{ success: boolean; msg?: string }>> {
        return apiClient.delete(`/frontdesk/surgical-cases/${caseId}`);
    },

    /**
     * Get doctors availability for a date range
     */
    async getDoctorsAvailability(startDate: Date, endDate: Date): Promise<{ success: boolean; data?: DoctorAvailabilityResponseDto[]; error?: string }> {
        // Format dates as YYYY-MM-DD for the API
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        return apiClient.get<DoctorAvailabilityResponseDto[]>(`/doctors/availability?startDate=${start}&endDate=${end}`);
    },

    /**
     * Get appointment by ID
     */
    async getAppointment(appointmentId: number): Promise<ApiResponse<AppointmentResponseDto>> {
        return apiClient.get<AppointmentResponseDto>(`/appointments/${appointmentId}`);
    },

    /**
     * Schedule a new appointment
     */
    async scheduleAppointment(dto: import('../../application/dtos/ScheduleAppointmentDto').ScheduleAppointmentDto): Promise<ApiResponse<AppointmentResponseDto>> {
        return apiClient.post<AppointmentResponseDto>('/appointments', dto);
    },

    /**
     * Get pending consultation requests
     */
    async getPendingConsultations(): Promise<ApiResponse<AppointmentResponseDto[]>> {
        return apiClient.get<AppointmentResponseDto[]>('/appointments?consultationRequestStatus=SUBMITTED,PENDING_REVIEW');
    },

    /**
     * Search patients by query
     */
    async searchPatients(query: string): Promise<ApiResponse<PatientResponseDto[]>> {
        return apiClient.get<PatientResponseDto[]>(`/patients/search?q=${encodeURIComponent(query)}`);
    },

    /**
     * Get patient by ID
     */
    async getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>> {
        return apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
    },

    /**
     * Create a new patient
     */
    async createPatient(dto: import('../../application/dtos/CreatePatientDto').CreatePatientDto): Promise<ApiResponse<PatientResponseDto>> {
        return apiClient.post<PatientResponseDto>('/patients', dto);
    },

    /**
     * Review consultation request
     */
    async reviewConsultation(
        appointmentId: number,
        action: 'approve' | 'decline' | 'request_info' | 'reject' | 'needs_more_info',
        data?: { reviewNotes?: string; proposedDate?: Date; proposedTime?: string }
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        // Map UI action names to API action names
        const apiAction = action === 'reject' ? 'decline' : action === 'needs_more_info' ? 'request_info' : action;
        return apiClient.post<AppointmentResponseDto>(`/consultations/${appointmentId}/review`, {
            action: apiAction,
            ...data,
        });
    },

    /**
     * Resolve stale appointment (complete or cancel)
     */
    async resolveStaleAppointment(
        appointmentId: number,
        action: 'complete' | 'cancel'
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/resolve`, {
            action,
        });
    },

    /**
     * Get today's appointments
     */
    async getTodayAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
      const today = getLocalDateString(new Date());
      return apiClient.get<AppointmentResponseDto[]>(`/appointments?date=${today}`);
    },

    /**
     * Get appointments by date
     */
    async getAppointmentsByDate(date: Date): Promise<ApiResponse<AppointmentResponseDto[]>> {
      const dateStr = getLocalDateString(date);
      return apiClient.get<AppointmentResponseDto[]>(`/appointments?date=${dateStr}`);
    },

    /**
     * Get upcoming appointments
     */
    async getUpcomingAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
        return apiClient.get<AppointmentResponseDto[]>('/appointments?status=SCHEDULED,CONFIRMED&upcoming=true');
    },

    /**
     * Get appointments for a specific patient
     */
    async getPatientAppointments(patientId: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
        return apiClient.get<AppointmentResponseDto[]>(`/appointments?patientId=${patientId}`);
    },

    /**
     * Get patients with pagination
     */
    async getPatients(params: { page: number; limit: number; q?: string }): Promise<ApiResponse<PatientResponseDto[]>> {
        const queryParams = new URLSearchParams({
            page: params.page.toString(),
            limit: params.limit.toString(),
        });
        if (params.q) {
            queryParams.set('q', params.q);
        }
        return apiClient.get<PatientResponseDto[]>(`/frontdesk/patients?${queryParams.toString()}`);
    },

    /**
     * Get overall patient stats
     */
    async getPatientStats(): Promise<ApiResponse<{ totalRecords: number; newToday: number; newThisMonth: number }>> {
        return apiClient.get<{ totalRecords: number; newToday: number; newThisMonth: number }>('/frontdesk/patients/stats');
    },

    /**
     * Get today's schedule
     */
    async getTodaysSchedule(doctorId?: string): Promise<ApiResponse<AppointmentResponseDto[]>> {
      const today = getLocalDateString(new Date());
      const url = doctorId 
          ? `/appointments?date=${today}&doctorId=${doctorId}`
          : `/appointments?date=${today}`;
      return apiClient.get<AppointmentResponseDto[]>(url);
    },

    /**
     * Check in a patient
     */
    async checkInPatient(appointmentId: number, data?: { notes?: string }): Promise<ApiResponse<AppointmentResponseDto>> {
        return apiClient.post<AppointmentResponseDto>(`/appointments/${appointmentId}/check-in`, data || {});
    },

    /**
     * Get consultations by status
     */
    async getConsultationsByStatus(statuses: string[]): Promise<ApiResponse<AppointmentResponseDto[]>> {
        const statusParam = statuses.join(',');
        return apiClient.get<AppointmentResponseDto[]>(`/appointments?consultationRequestStatus=${statusParam}`);
    },

    /**
     * Create consultation from frontdesk
     */
    async createConsultation(dto: import('../../application/dtos/CreateConsultationFromFrontdeskDto').CreateConsultationFromFrontdeskDto): Promise<ApiResponse<AppointmentResponseDto>> {
        return apiClient.post<AppointmentResponseDto>('/consultations/frontdesk/create', dto);
    },
};
