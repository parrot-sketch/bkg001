/**
 * DTO: ScheduleBlockDto
 * 
 * Data Transfer Object for schedule blocks (leave, surgery, admin, etc.)
 */

export interface CreateScheduleBlockDto {
  readonly doctorId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly startTime?: string; // HH:mm - if undefined, entire day blocked
  readonly endTime?: string;   // HH:mm - if undefined, entire day blocked
  readonly blockType: string; // "LEAVE", "SURGERY", "ADMIN", "EMERGENCY", "CONFERENCE", "BURNOUT_PROTECTION", etc.
  readonly reason?: string;
  readonly createdBy: string; // User ID who created the block
}

export interface ScheduleBlockResponseDto {
  readonly id: string;
  readonly doctorId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly blockType: string;
  readonly reason?: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
