/**
 * Shared Scheduling Domain Types
 * 
 * Provides a unified model for all types of bookings (Clinic, Surgery, etc.)
 */

export type SchedulingStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW'
  | 'PROVISIONAL'; // For theater locking

export type SchedulingType = 
  | 'CONSULTATION' 
  | 'SURGERY' 
  | 'PROCEDURE' 
  | 'FOLLOW_UP' 
  | 'ADMIN';

/**
 * Common interface for any item that can be placed on a calendar
 */
export interface SchedulableEntity {
  id: string;
  start: Date;
  end: Date;
  title: string;
  status: string;
  type: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

/**
 * Unified response structure for schedule queries
 */
export interface ScheduleData {
  items: SchedulableEntity[];
  availability: any[]; // Working hours/slots
  conflicts: string[]; // IDs of items with conflicts
}
