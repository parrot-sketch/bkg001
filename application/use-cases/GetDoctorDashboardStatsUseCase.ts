import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { GetPendingConsultationRequestsDto } from '../dtos/GetPendingConsultationRequestsDto';
import { DoctorDashboardStatsDto } from '../dtos/DoctorDashboardStatsDto';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';

/**
 * Use Case: GetDoctorDashboardStatsUseCase
 * 
 * Orchestrates retrieving dashboard statistics for a doctor.
 * 
 * Business Purpose:
 * - Provides aggregated statistics for doctor dashboard
 * - Calculates today's appointments count
 * - Calculates pending consultation requests count
 * - Calculates pending check-ins count
 * - Calculates upcoming appointments count
 * 
 * Clinical Workflow:
 * This is part of the doctor dashboard display:
 * 1. Doctor views dashboard → GetDoctorDashboardStatsUseCase (this)
 * 2. Doctor sees decision queue and today's schedule
 * 
 * Business Rules:
 * - Only counts appointments assigned to the doctor
 * - Today's appointments: appointments scheduled for today
 * - Pending consultation requests: appointments with PENDING_REVIEW or APPROVED status
 * - Pending check-ins: today's appointments without check-in
 * - Upcoming appointments: appointments scheduled for next 3-5 days
 */
export class GetDoctorDashboardStatsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly timeService: ITimeService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!timeService) {
      throw new Error('TimeService is required');
    }
  }

  /**
   * Executes the get doctor dashboard stats use case
   * 
   * @param doctorId - Doctor ID to get statistics for
   * @returns Promise resolving to DoctorDashboardStatsDto with statistics
   */
  async execute(doctorId: string): Promise<DoctorDashboardStatsDto> {
    // Step 1: Get all appointments for the doctor
    const allAppointments = await this.appointmentRepository.findByDoctor(doctorId);

    // Step 2: Get current date/time
    const now = this.timeService.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 5);

    // Step 3: Initialize counters
    let todayAppointmentsCount = 0;
    let pendingConsultationRequestsCount = 0;
    let pendingCheckInsCount = 0;
    let upcomingAppointmentsCount = 0;

    // Step 4: Process each appointment
    for (const appointment of allAppointments) {
      const appointmentDate = appointment.getAppointmentDate();
      const appointmentDateOnly = new Date(appointmentDate);
      appointmentDateOnly.setHours(0, 0, 0, 0);

      // Skip cancelled and completed appointments for most counts
      const isCancelled = appointment.getStatus() === AppointmentStatus.CANCELLED;
      const isCompleted = appointment.getStatus() === AppointmentStatus.COMPLETED;

      // Today's appointments
      if (
        appointmentDateOnly.getTime() === today.getTime() &&
        !isCancelled &&
        !isCompleted
      ) {
        todayAppointmentsCount++;

        // Pending check-ins (today's appointments without check-in)
        // Note: We'd need to check checked_in_at field, but for now we'll count all today's appointments
        // This can be enhanced when we have check-in tracking
        if (appointment.getStatus() === AppointmentStatus.SCHEDULED || appointment.getStatus() === AppointmentStatus.PENDING) {
          pendingCheckInsCount++;
        }
      }

      // Upcoming appointments (next 3-5 days)
      if (
        appointmentDateOnly > today &&
        appointmentDateOnly <= nextWeek &&
        !isCancelled &&
        !isCompleted
      ) {
        upcomingAppointmentsCount++;
      }

      // Pending consultation requests
      if (!isCancelled && !isCompleted) {
        try {
          const consultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(
            appointment.getId(),
          );
          const status = consultationFields?.consultationRequestStatus;
          if (
            status === ConsultationRequestStatus.PENDING_REVIEW ||
            status === ConsultationRequestStatus.APPROVED
          ) {
            pendingConsultationRequestsCount++;
          }
        } catch (error) {
          // Skip if we can't get consultation request fields
          console.error(`Failed to get consultation request fields for appointment ${appointment.getId()}:`, error);
        }
      }
    }

    // Step 5: Return statistics
    return {
      todayAppointmentsCount,
      pendingConsultationRequestsCount,
      pendingCheckInsCount,
      upcomingAppointmentsCount,
    };
  }
}
