/**
 * Domain Types for Doctor Scheduling
 * 
 * These types represent the domain model for scheduling, properly typed
 * from the database schema upwards. They provide type safety and clear
 * contracts between layers.
 */

import { AvailabilitySlot as PrismaAvailabilitySlot, SlotConfiguration as PrismaSlotConfiguration, AvailabilityTemplate as PrismaAvailabilityTemplate } from '@prisma/client';

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Slot type enum - matches database default
 */
export type SlotType = 'CLINIC' | 'SURGERY' | 'ADMIN';

/**
 * Time string in HH:mm format
 */
export type TimeString = string; // Format: "HH:mm"

/**
 * Availability Slot Domain Model
 * Represents a recurring weekly availability slot
 */
export interface AvailabilitySlot {
  readonly id: string;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: TimeString;
  readonly endTime: TimeString;
  readonly slotType: SlotType;
  readonly maxPatients?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Slot Configuration Domain Model
 * Controls how appointment slots are generated from availability
 */
export interface SlotConfiguration {
  readonly id: string;
  readonly doctorId: string;
  readonly defaultDuration: number; // minutes
  readonly slotInterval: number; // minutes
  readonly bufferTime: number; // minutes
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Availability Template Domain Model
 * Contains a set of recurring weekly slots
 */
export interface AvailabilityTemplate {
  readonly id: string;
  readonly doctorId: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly slots: AvailabilitySlot[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Working Day DTO (for UI/API)
 * Simplified representation for template editing
 */
export interface WorkingDay {
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: TimeString;
  readonly endTime: TimeString;
  readonly type?: SlotType;
}

/**
 * Slot Configuration DTO (for UI/API)
 * Simplified representation for configuration editing
 */
export interface SlotConfigurationDto {
  readonly defaultDuration: number;
  readonly slotInterval: number;
  readonly bufferTime: number;
}

/**
 * Calendar Event (for react-big-calendar)
 * Represents an availability slot in the calendar view
 */
export interface CalendarAvailabilitySlot {
  readonly id: string;
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  readonly type: SlotType;
}
