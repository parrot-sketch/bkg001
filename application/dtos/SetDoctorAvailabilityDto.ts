/**
 * DTO: SetDoctorAvailabilityDto
 * 
 * Data Transfer Object for setting doctor availability.
 */

export interface SetDoctorAvailabilityDto {
  readonly doctorId: string;
  readonly workingDays: WorkingDayDto[];
  readonly slotConfiguration?: SlotConfigurationDto;
}

export interface WorkingDayDto {
  readonly day: string; // Monday, Tuesday, etc.
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly isAvailable: boolean;
  readonly breaks?: AvailabilityBreakDto[];
}

export interface AvailabilityBreakDto {
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly reason?: string;
}

export interface SlotConfigurationDto {
  readonly defaultDuration: number; // minutes
  readonly bufferTime: number;      // minutes
  readonly slotInterval: number;    // minutes
}
