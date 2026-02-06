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
  readonly startTime: string; // HH:mm (backward compatibility: used if no sessions)
  readonly endTime: string;   // HH:mm (backward compatibility: used if no sessions)
  readonly isAvailable: boolean;
  readonly type?: string;
  readonly breaks?: AvailabilityBreakDto[];
  readonly sessions?: ScheduleSessionDto[]; // Enterprise feature: multiple sessions per day
}

export interface ScheduleSessionDto {
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly sessionType?: string; // "Clinic", "Ward Rounds", "Teleconsult", "Surgery", etc.
  readonly maxPatients?: number; // Optional: maximum appointments per session
  readonly notes?: string;
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
