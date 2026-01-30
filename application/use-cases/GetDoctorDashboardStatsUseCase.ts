import { IDoctorStatsRepository } from '../../domain/interfaces/repositories/IDoctorStatsRepository';
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
    private readonly appointmentRepository: IDoctorStatsRepository,
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
    // REFACTOR: Use optimized repository method to fetch aggregated stats in O(1)
    // This replaces the previous implementation that:
    // 1. Fetched all appointments (potentially thousands)
    // 2. Looped through them in memory
    // 3. Made N+1 queries for consultation fields

    return this.appointmentRepository.getDoctorStats(doctorId);
  }
}
