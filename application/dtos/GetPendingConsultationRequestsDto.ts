/**
 * DTO: GetPendingConsultationRequestsDto
 * 
 * Data Transfer Object for querying pending consultation requests for a doctor.
 */
export interface GetPendingConsultationRequestsDto {
  /**
   * Doctor ID to get pending requests for
   */
  readonly doctorId: string;

  /**
   * Optional status filter
   */
  readonly status?: string;

  /**
   * Optional limit for pagination
   */
  readonly limit?: number;

  /**
   * Optional offset for pagination
   */
  readonly offset?: number;
}
