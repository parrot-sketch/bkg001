/**
 * Repository Interface: IDoctorStatsRepository
 * 
 * Defines the contract for reading aggregated doctor statistics.
 * This adheres to the Interface Segregation Principle (ISP) by separating
 * dashboard/read-only concerns from the transactional IAppointmentRepository.
 */
export interface IDoctorStatsRepository {
    /**
     * Gets aggregated dashboard statistics for a doctor
     * 
     * @param doctorId - The doctor's unique identifier
     * @returns Promise resolving to the stats object
     */
    getDoctorStats(doctorId: string): Promise<{
        todayAppointmentsCount: number;
        pendingConsultationRequestsCount: number;
        pendingCheckInsCount: number;
        upcomingAppointmentsCount: number;
    }>;
}
