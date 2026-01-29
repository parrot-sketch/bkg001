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
  startTime: string; // HH:mm (backward compatibility: used if no sessions exist)
  endTime: string;   // HH:mm (backward compatibility: used if no sessions exist)
  isAvailable: boolean;
}

export interface ScheduleSession {
  id: string;
  workingDayId: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  sessionType?: string; // "Clinic", "Ward Rounds", "Teleconsult", "Surgery", etc.
  maxPatients?: number; // Optional: maximum appointments per session
  notes?: string;
}

export interface ScheduleBlock {
  id: string;
  doctorId: string;
  startDate: Date;
  endDate: Date;
  startTime?: string; // HH:mm - if undefined, entire day blocked
  endTime?: string;   // HH:mm - if undefined, entire day blocked
  blockType: string; // "LEAVE", "SURGERY", "ADMIN", "EMERGENCY", "CONFERENCE", "BURNOUT_PROTECTION", etc.
  reason?: string;
  createdBy: string; // User ID who created the block
}

export interface AvailabilityOverride {
  id: string;
  doctorId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isBlocked: boolean;
  startTime?: string; // HH:mm format - custom start time (only for single-day overrides)
  endTime?: string;   // HH:mm format - custom end time (only for single-day overrides)
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
  sessions: ScheduleSession[]; // All sessions for all working days
  overrides: AvailabilityOverride[];
  blocks: ScheduleBlock[]; // Explicit blocked periods
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

  /**
   * Get schedule sessions for a working day
   */
  getSessionsForWorkingDay(workingDayId: number): Promise<ScheduleSession[]>;

  /**
   * Save schedule sessions for a working day (replaces existing)
   */
  saveSessionsForWorkingDay(workingDayId: number, sessions: Omit<ScheduleSession, 'id' | 'workingDayId'>[]): Promise<ScheduleSession[]>;

  /**
   * Delete schedule session
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Get schedule blocks for a doctor within date range
   */
  getBlocks(doctorId: string, startDate: Date, endDate: Date): Promise<ScheduleBlock[]>;

  /**
   * Create schedule block
   */
  createBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock>;

  /**
   * Delete schedule block
   */
  deleteBlock(blockId: string): Promise<void>;
}
