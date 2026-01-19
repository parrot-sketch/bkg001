import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { GetPendingConsultationRequestsDto } from '../dtos/GetPendingConsultationRequestsDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: GetPendingConsultationRequestsUseCase
 * 
 * Orchestrates retrieving pending consultation requests for a doctor.
 * 
 * Business Purpose:
 * - Allows doctors to view consultation requests requiring their decision
 * - Filters by consultation request status (PENDING_REVIEW, APPROVED)
 * - Returns read-only projection for dashboard display
 * 
 * Clinical Workflow:
 * This is part of the consultation request review workflow:
 * 1. Doctor views pending requests → GetPendingConsultationRequestsUseCase (this)
 * 2. Doctor accepts/declines/requests info → Accept/Decline/RequestMoreInfo use cases
 * 
 * Business Rules:
 * - Only returns appointments assigned to the doctor
 * - Only returns appointments with pending consultation request status
 * - Excludes cancelled and completed appointments
 * - Supports pagination
 */
export class GetPendingConsultationRequestsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
  }

  /**
   * Executes the get pending consultation requests use case
   * 
   * @param dto - GetPendingConsultationRequestsDto with doctor ID and optional filters
   * @returns Promise resolving to array of AppointmentResponseDto with consultation request details
   * @throws DomainException if validation fails
   */
  async execute(dto: GetPendingConsultationRequestsDto): Promise<AppointmentResponseDto[]> {
    // Step 1: Get all appointments for the doctor
    const allAppointments = await this.appointmentRepository.findByDoctor(dto.doctorId);

    // Step 2: Filter appointments with pending consultation requests
    const pendingAppointments: Array<{ appointment: any; consultationFields: ConsultationRequestFields | null }> = [];

    for (const appointment of allAppointments) {
      // Skip cancelled and completed appointments
      if (
        appointment.getStatus() === AppointmentStatus.CANCELLED ||
        appointment.getStatus() === AppointmentStatus.COMPLETED
      ) {
        continue;
      }

      // Get consultation request fields
      let consultationFields: ConsultationRequestFields | null = null;
      try {
        consultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(
          appointment.getId(),
        );
      } catch (error) {
        console.error(`Failed to get consultation request fields for appointment ${appointment.getId()}:`, error);
        continue;
      }

      // Filter by consultation request status
      const status = consultationFields?.consultationRequestStatus;
      if (!status) {
        continue; // Skip if no consultation request status
      }

      // Apply status filter if provided
      if (dto.status) {
        if (status !== dto.status) {
          continue;
        }
      } else {
        // Default: only PENDING_REVIEW and APPROVED
        if (
          status !== ConsultationRequestStatus.PENDING_REVIEW &&
          status !== ConsultationRequestStatus.APPROVED
        ) {
          continue;
        }
      }

      pendingAppointments.push({ appointment, consultationFields });
    }

    // Step 3: Sort by creation date (oldest first - prioritize older requests)
    pendingAppointments.sort((a, b) => {
      const aDate = a.appointment.getCreatedAt()?.getTime() || 0;
      const bDate = b.appointment.getCreatedAt()?.getTime() || 0;
      return aDate - bDate;
    });

    // Step 4: Apply pagination
    const offset = dto.offset || 0;
    const limit = dto.limit || 50;
    const paginatedAppointments = pendingAppointments.slice(offset, offset + limit);

    // Step 5: Map to response DTOs
    const responseDtos = paginatedAppointments.map(({ appointment, consultationFields }) =>
      ApplicationAppointmentMapper.toResponseDto(appointment, consultationFields),
    );

    return responseDtos;
  }
}
