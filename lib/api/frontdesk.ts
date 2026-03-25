/**
 * Frontdesk API Client
 *
 * API methods for frontdesk operations including theater scheduling.
 */

import { apiClient, ApiResponse } from './client';
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
        const today = new Date().toISOString().split('T')[0];
        return apiClient.get<AppointmentResponseDto[]>(`/appointments?date=${today}`);
    },

    /**
     * Get appointments by date
     */
    async getAppointmentsByDate(date: Date): Promise<ApiResponse<AppointmentResponseDto[]>> {
        const dateStr = date.toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
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
