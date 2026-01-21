/**
 * DTO: DoctorAvailabilityResponseDto
 * 
 * Response DTO for doctor availability data.
 */

import { WorkingDayDto, AvailabilityBreakDto, SlotConfigurationDto } from './SetDoctorAvailabilityDto';

export interface AvailabilityOverrideDto {
  readonly id: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly reason?: string;
  readonly isBlocked: boolean;
}

export interface DoctorAvailabilityResponseDto {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly specialization: string;
  readonly workingDays: WorkingDayDto[];
  readonly slotConfiguration?: SlotConfigurationDto;
  readonly overrides: AvailabilityOverrideDto[];
}
