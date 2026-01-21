/**
 * DTO: AvailableSlotResponseDto
 * 
 * Response DTO for available time slots.
 */

export interface AvailableSlotResponseDto {
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly duration: number;  // minutes
  readonly isAvailable: boolean;
}
