/**
 * DTO: DoctorDashboardStatsDto
 * 
 * Data Transfer Object for doctor dashboard statistics.
 */
export interface DoctorDashboardStatsDto {
  /**
   * Number of appointments scheduled for today
   */
  readonly todayAppointmentsCount: number;

  /**
   * Number of pending consultation requests
   */
  readonly pendingConsultationRequestsCount: number;

  /**
   * Number of pending check-ins (patients who haven't arrived yet)
   */
  readonly pendingCheckInsCount: number;

  /**
   * Number of upcoming appointments (next 3-5 days)
   */
  readonly upcomingAppointmentsCount: number;
}
