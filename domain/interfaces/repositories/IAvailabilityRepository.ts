/**
 * Repository Interface: IAvailabilityRepository
 * 
 * Defines data access operations for doctor availability management.
 * 
 * Clean Architecture: This interface belongs in the domain layer.
 * Implementations belong in the infrastructure layer.
 */

export interface WorkingDay {
  id: number;
  doctorId: string;
  day: string; // Monday, Tuesday, etc.
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

export interface AvailabilityOverride {
  id: string;
  doctorId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isBlocked: boolean;
}

export interface AvailabilityBreak {
  id: string;
  doctorId: string;
  workingDayId?: number;
  dayOfWeek?: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  reason?: string;
}

export interface SlotConfiguration {
  id: string;
  doctorId: string;
  defaultDuration: number; // minutes
  bufferTime: number;      // minutes
  slotInterval: number;    // minutes
}

export interface DoctorAvailability {
  doctorId: string;
  workingDays: WorkingDay[];
  overrides: AvailabilityOverride[];
  breaks: AvailabilityBreak[];
  slotConfiguration?: SlotConfiguration;
}

export interface IAvailabilityRepository {
  /**
   * Get doctor's complete availability (working days, overrides, breaks, slot config)
   */
  getDoctorAvailability(doctorId: string): Promise<DoctorAvailability | null>;

  /**
   * Get working days for a doctor
   */
  getWorkingDays(doctorId: string): Promise<WorkingDay[]>;

  /**
   * Save working days (replaces existing)
   */
  saveWorkingDays(doctorId: string, workingDays: WorkingDay[]): Promise<void>;

  /**
   * Get availability overrides for a doctor within date range
   */
  getOverrides(doctorId: string, startDate: Date, endDate: Date): Promise<AvailabilityOverride[]>;

  /**
   * Create availability override
   */
  createOverride(override: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride>;

  /**
   * Delete availability override
   */
  deleteOverride(overrideId: string): Promise<void>;

  /**
   * Get availability breaks for a doctor
   */
  getBreaks(doctorId: string): Promise<AvailabilityBreak[]>;

  /**
   * Create availability break
   */
  createBreak(breakData: Omit<AvailabilityBreak, 'id'>): Promise<AvailabilityBreak>;

  /**
   * Delete availability break
   */
  deleteBreak(breakId: string): Promise<void>;

  /**
   * Get slot configuration for a doctor
   */
  getSlotConfiguration(doctorId: string): Promise<SlotConfiguration | null>;

  /**
   * Save slot configuration (creates or updates)
   */
  saveSlotConfiguration(config: SlotConfiguration): Promise<SlotConfiguration>;
}
