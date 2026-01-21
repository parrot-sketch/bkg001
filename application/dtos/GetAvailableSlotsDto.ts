/**
 * DTO: GetAvailableSlotsDto
 * 
 * Data Transfer Object for getting available slots.
 */

export interface GetAvailableSlotsDto {
  readonly doctorId: string;
  readonly date: Date;
  readonly duration?: number; // Optional: filter by slot duration (minutes)
}
