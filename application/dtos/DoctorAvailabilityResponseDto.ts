/**
 * DTO: DoctorAvailabilityResponseDto
 * 
 * Response DTO for doctor availability data.
 * 
 * For frontdesk dashboard booking flow, only doctorId, doctorName,
 * specialization, and isAvailable are required.
 * 
 * Other fields are optional for backward compatibility with
 * doctor-facing availability views.
 */

export interface AvailabilityOverrideDto {
  readonly id: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly reason?: string;
  readonly isBlocked: boolean;
}

export interface WorkingDayDto {
  readonly id: string;
  readonly doctorId: string;
  readonly day: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isAvailable: boolean;
  readonly type?: string;
}

export interface SlotConfigurationDto {
  readonly id: string;
  readonly doctorId: string;
  readonly defaultDuration: number;
  readonly bufferTime: number;
  readonly slotInterval: number;
}

export interface SessionDto {
  readonly workingDayId: string;
  readonly day: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly sessionType?: string;
  readonly maxPatients?: number;
  readonly notes?: string;
}

export interface DoctorAvailabilityResponseDto {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly specialization: string;
  readonly isAvailable: boolean;
  readonly workingDays?: WorkingDayDto[];
  readonly slotConfiguration?: SlotConfigurationDto;
  readonly overrides?: AvailabilityOverrideDto[];
  readonly sessions?: SessionDto[];
}
