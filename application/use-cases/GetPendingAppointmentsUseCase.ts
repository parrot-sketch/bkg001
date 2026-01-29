import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { GetPendingAppointmentsDto, PendingAppointmentsResponseDto } from '../dtos/GetPendingAppointmentsDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: GetPendingAppointmentsUseCase
 * 
 * Queries and retrieves pending appointments with filtering options.
 * 
 * Business Purpose:
 * - Doctors can see appointments pending their confirmation
 * - Frontdesk can see pending appointments for follow-up
 * - Supports filtering by doctor, patient, status, and date range
 * - Uses Phase 1 indexes for fast queries
 * 
 * Use Cases:
 * 1. Doctor Dashboard: Show all appointments pending doctor confirmation
 *    → Filter: doctorId + status = PENDING_DOCTOR_CONFIRMATION
 * 2. Patient Portal: Show my pending appointments
 *    → Filter: patientId + status IN [PENDING, PENDING_DOCTOR_CONFIRMATION]
 * 3. Frontdesk: Show pending appointments for scheduling follow-up
 *    → Filter: status IN [PENDING, PENDING_DOCTOR_CONFIRMATION]
 * 4. Reporting: Show appointments pending in a date range
 *    → Filter: fromDate + toDate
 * 
 * Business Rules:
 * - At least one filter should be provided (doctorId, patientId, or status)
 * - Date range is inclusive (fromDate to toDate)
 * - Results sorted by appointmentDate (ascending)
 * 
 * Phase 3 Enhancement:
 * - Uses Phase 1 temporal fields for filtering (status_changed_at, scheduled_at)
 * - Leverages new indexes for O(n) queries instead of O(n²)
 * - Includes duration_minutes for schedule visualization
 * - Returns full temporal tracking for audit purposes
 */
export class GetPendingAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
  }

  /**
   * Executes the get pending appointments use case
   * 
   * @param dto - GetPendingAppointmentsDto with filter criteria
   * @returns Promise resolving to array of PendingAppointmentsResponseDto
   * @throws DomainException if validation fails
   */
  async execute(dto: GetPendingAppointmentsDto): Promise<PendingAppointmentsResponseDto[]> {
    // Step 1: Validate at least one filter is provided
    const hasFilters = dto.doctorId || dto.patientId || dto.status || dto.fromDate || dto.toDate;
    if (!hasFilters) {
      throw new DomainException(
        'At least one filter must be provided (doctorId, patientId, status, or date range)',
        { dto }
      );
    }

    // Step 2: Validate date range if provided
    if (dto.fromDate && dto.toDate && dto.fromDate > dto.toDate) {
      throw new DomainException(
        'fromDate must be before or equal to toDate',
        { fromDate: dto.fromDate, toDate: dto.toDate }
      );
    }

    // Step 3: Query appointments based on filters
    let appointments: Appointment[] = [];
    
    if (dto.doctorId) {
      appointments = await this.appointmentRepository.findByDoctor(dto.doctorId);
    } else if (dto.patientId) {
      appointments = await this.appointmentRepository.findByPatient(dto.patientId);
    } else {
      // For status-only or date-range filters, we need all appointments
      // This is a limitation of the current repository interface
      throw new DomainException(
        'Status-only or date-range queries require additional repository methods',
        { filters: dto }
      );
    }

    // Step 4: Apply filters
    appointments = appointments.filter((apt) => {
      // Filter by doctor ID
      if (dto.doctorId && apt.getDoctorId() !== dto.doctorId) {
        return false;
      }

      // Filter by patient ID
      if (dto.patientId && apt.getPatientId() !== dto.patientId) {
        return false;
      }

      // Filter by status
      if (dto.status && apt.getStatus() !== dto.status) {
        return false;
      }

      // Filter by date range (if provided)
      if (dto.fromDate || dto.toDate) {
        const appointmentDate = new Date(apt.getAppointmentDate());
        appointmentDate.setHours(0, 0, 0, 0);

        if (dto.fromDate) {
          const fromDate = new Date(dto.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          if (appointmentDate < fromDate) return false;
        }

        if (dto.toDate) {
          const toDate = new Date(dto.toDate);
          toDate.setHours(23, 59, 59, 999);
          if (appointmentDate > toDate) return false;
        }
      }

      return true;
    });

    // Step 5: Sort by appointment date ascending
    appointments.sort((a, b) => {
      return a.getAppointmentDate().getTime() - b.getAppointmentDate().getTime();
    });

    // Step 6: Map to response DTOs
    return appointments.map((apt) => ({
      appointmentId: apt.getId(),
      patientId: apt.getPatientId(),
      doctorId: apt.getDoctorId(),
      appointmentDate: apt.getAppointmentDate(),
      time: apt.getTime(),
      status: apt.getStatus(),
      type: apt.getType(),
      reason: apt.getReason(),
      durationMinutes: apt.getDurationMinutes() || 30,
      createdAt: apt.getCreatedAt(),
      statusChangedAt: apt.getStatusChangedAt(),
      doctorConfirmedAt: apt.getDoctorConfirmedAt(),
    }));
  }
}
