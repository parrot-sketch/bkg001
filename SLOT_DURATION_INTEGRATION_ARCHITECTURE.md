#!/usr/bin/env node

/**
 * Slot Duration Integration Flow
 * 
 * This document explains the seamless integration of doctor-configured slot durations
 * into the consultation room timer and appointment scheduling.
 * 
 * ============================================================================
 * DATA FLOW: Doctor Configuration → Appointment → Consultation Timer
 * ============================================================================
 * 
 * STEP 1: DOCTOR CONFIGURES AVAILABILITY
 * ─────────────────────────────────────────────────────────────────────────
 * Location: /doctor/profile → ManageAvailabilityDialog.tsx
 * 
 * Doctor sets:
 * - Working days (Monday-Friday)
 * - Working hours per day (e.g., 09:00-17:00)
 * - Slot Configuration:
 *   • defaultDuration: 30 minutes (how long each appointment lasts)
 *   • bufferTime: 0-30 minutes (breathing room after appointment)
 *   • slotInterval: 15 minutes (when new slots start: 9:00, 9:15, 9:30...)
 * 
 * API Call: PUT /api/doctors/me/availability
 * Stored in:
 * - prisma Doctor.workingDays (relationship to WorkingDay table)
 * - prisma SlotConfiguration table
 *
 * ============================================================================
 * STEP 2: DOCTOR CREATES SCHEDULE WITH PRESETS
 * ─────────────────────────────────────────────────────────────────────────
 * Location: /doctor/schedule → ScheduleCalendarView.tsx + SlotConfigurationPanel.tsx
 * 
 * Doctor uses preset or creates custom schedule:
 * - Selects date range and working day pattern
 * - Chooses "Generate from Availability" or "Custom"
 * - System uses SlotConfiguration to create available time slots
 *   Example: 09:00-09:30, 09:15-09:45, 09:30-10:00, etc.
 * 
 * Available slots are calculated:
 * - Available time windows: from WorkingDay data (09:00-17:00)
 * - Slot size: 30 minutes (from SlotConfiguration.defaultDuration)
 * - Buffer: 0 minutes added between appointments
 * - Offset: 15 minutes (new slots start every 15 min)
 * 
 * These slots can then be booked by patients → creates Appointment records
 *
 * ============================================================================
 * STEP 3: PATIENT BOOKS APPOINTMENT
 * ─────────────────────────────────────────────────────────────────────────
 * Location: Frontend appointment booking flow
 * 
 * Patient selects available slot → creates Appointment record with:
 * - appointment_date: when appointment is scheduled
 * - slot_start_time: "14:30" (HH:mm format - when slot begins)
 * - slot_duration: 30 (copied from SlotConfiguration.defaultDuration)
 * - duration_minutes: 30 (alternative field for clarity)
 * - status: SCHEDULED
 * 
 * Database state after booking:
 * ```
 * Appointment {
 *   id: 42,
 *   doctor_id: "doc-123",
 *   appointment_date: "2026-03-10",
 *   slot_start_time: "14:30",           // From doctor's schedule
 *   slot_duration: 30,                   // From SlotConfiguration
 *   status: "SCHEDULED"
 * }
 * ```
 *
 * ============================================================================
 * STEP 4: CONSULTATION ROOM LOADS APPOINTMENT DATA
 * ─────────────────────────────────────────────────────────────────────────
 * Location: /doctor/consultations/[appointmentId]/session/page.tsx
 * 
 * When doctor opens consultation room:
 * 1. Page loads Appointment record with:
 *    - slotStartTime: Date("2026-03-10T14:30:00")
 *    - slotDurationMinutes: 30
 * 
 * 2. ConsultationSessionHeader receives props:
 *    ```tsx
 *    <ConsultationSessionHeader
 *      slotStartTime={appointment.slot_start_time}
 *      slotDurationMinutes={appointment.slot_duration}
 *      ...props
 *    />
 *    ```
 * 
 * 3. Header timer calculates:
 *    - slotEnd = slotStart + slotDuration
 *    - remaining = slotEnd - now
 *    - percentUsed = (elapsed / slotDuration) * 100
 *    - warnings at 80%, overrun at 100%+
 *
 * ============================================================================
 * DATA DEPENDENCIES AND CONSISTENCY
 * ============================================================================
 * 
 * Critical Path for Data Consistency:
 * 
 * 1. WRITE: Doctor updates availability
 *    SlotConfiguration table ← ManageAvailabilityDialog
 *    
 * 2. READ: Schedule generation uses config
 *    ScheduleCalendarView reads SlotConfiguration → generates slots
 *    
 * 3. WRITE: Patient books appointment
 *    Appointment.slot_duration ← SlotConfiguration.defaultDuration
 *    (at booking time, capture the duration value)
 *    
 * 4. READ: Consultation room displays timer
 *    ConsultationSessionHeader reads Appointment.slot_duration
 *    (this value should never change after appointment creation)
 * 
 * ⚠️ IMPORTANT INVARIANTS:
 * - slot_duration is IMMUTABLE after appointment creation
 *   (protects against doctor changing config mid-consultation)
 * - slot_start_time is IMMUTABLE after appointment creation
 *   (schedule lock prevents changes)
 * - defaultDuration is MUTABLE in SlotConfiguration
 *   (only affects NEW appointments, not existing ones)
 *
 * ============================================================================
 * IMPLEMENTATION CHECKLIST
 * ============================================================================
 * 
 * Backend (API Routes):
 * ✅ GET /api/doctors/me/availability
 *    Returns: { workingDays, slotConfiguration }
 * ✅ PUT /api/doctors/me/availability
 *    Stores: slotConfiguration in database
 * ✅ GET /api/appointments/:id
 *    Returns: { slot_start_time, slot_duration }
 * ✅ GET /api/consultations/:id
 *    Returns: { appointment with slot data }
 * 
 * Frontend (Components):
 * ✅ ManageAvailabilityDialog
 *    Captures: defaultDuration, bufferTime, slotInterval
 * ✅ ScheduleCalendarView
 *    Uses: SlotConfiguration to generate available slots
 * ✅ ConsultationSessionHeader
 *    Accepts: slotStartTime, slotDurationMinutes props
 *    Displays: remaining time, progress bar, warnings
 * ✅ ConsultationSessionPage (parent)
 *    Passes: appointment.slot_duration to header
 * 
 * Context/State Management:
 * ✅ ConsultationContext
 *    Stores: appointment with slot_duration
 *    Heartbeat: updates last_activity_at (doesn't touch slot_duration)
 * 
 * Database (Prisma Schema):
 * ✅ Appointment.slot_start_time (String in HH:mm format)
 * ✅ Appointment.slot_duration (Int in minutes, default 30)
 * ✅ Appointment.duration_minutes (Int, alternative field)
 * ✅ SlotConfiguration.defaultDuration (Int in minutes)
 * ✅ SlotConfiguration.bufferTime (Int in minutes)
 * ✅ SlotConfiguration.slotInterval (Int in minutes)
 * ✅ Doctor.slotConfiguration (relationship)
 * ✅ Consultation.last_activity_at (for session timeout)
 *
 * ============================================================================
 * EDGE CASES AND HANDLING
 * ============================================================================
 * 
 * Edge Case 1: Doctor changes slot config, patient books afterward
 * - EXPECTED: New appointment uses NEW defaultDuration
 * - REASON: slot_duration captured at booking time from current config
 * - ACTION: No special handling needed (automatic via booking logic)
 * 
 * Edge Case 2: Doctor changes slot config MID-CONSULTATION
 * - EXPECTED: Timer still shows ORIGINAL duration (immutable)
 * - REASON: Appointment.slot_duration never changes after creation
 * - ACTION: No mechanism to update (intentional design - for safety)
 * 
 * Edge Case 3: Consultation exceeds slot duration
 * - EXPECTED: Timer shows overrun in red (e.g., "+5m over")
 * - REASON: percentUsed > 100% triggers warning state
 * - ACTION: Doctor sees visual indicator, can continue or end
 * 
 * Edge Case 4: New appointment without slot_duration (legacy data)
 * - EXPECTED: Timer uses fallback: 30 minutes
 * - REASON: Default value in Appointment model
 * - ACTION: Graceful degradation, timer still works
 * 
 * Edge Case 5: Appointment spans multiple days (shouldn't happen)
 * - EXPECTED: Timer calculates to midnight of appointment_date
 * - REASON: slot_duration is minutes, not spanning dates
 * - ACTION: No special handling (constraint in booking logic)
 *
 * ============================================================================
 * DATABASE SCHEMA REFERENCES
 * ============================================================================
 * 
 * Model: SlotConfiguration
 * ─────────────────────────────────────────────────────────────────────────
 * doctor_id             String      (FK to Doctor)
 * default_duration      Int         (minutes: 15-120)
 * buffer_time           Int         (minutes: 0-30)
 * slot_interval         Int         (minutes: 5-30)
 * created_at            DateTime
 * updated_at            DateTime
 * 
 * Model: Appointment (relevant fields)
 * ─────────────────────────────────────────────────────────────────────────
 * id                    Int
 * appointment_date      DateTime    (date of appointment)
 * slot_start_time       String      (HH:mm format, e.g. "14:30")
 * slot_duration         Int         (minutes, default 30, immutable)
 * duration_minutes      Int         (alternative, same meaning)
 * doctor_id             String      (FK to Doctor)
 * status                AppointmentStatus
 * created_at            DateTime
 * updated_at            DateTime
 * 
 * Model: Consultation (relevant fields)
 * ─────────────────────────────────────────────────────────────────────────
 * id                    Int
 * appointment_id        Int         (FK to Appointment)
 * started_at            DateTime
 * completed_at          DateTime?
 * last_activity_at      DateTime    (heartbeat timestamp)
 * doctor_id             String      (FK to Doctor)
 * created_at            DateTime
 * updated_at            DateTime
 *
 * ============================================================================
 * PERFORMANCE CONSIDERATIONS
 * ============================================================================
 * 
 * Query Optimization:
 * - Appointment lookup: Index on (doctor_id, appointment_date)
 * - Slot duration: Denormalized in Appointment (fast, no join needed)
 * - SlotConfiguration: Cached in doctor profile (updated rarely)
 * 
 * Frontend Optimization:
 * - Timer: Updates every 1 second (efficient useEffect with cleanup)
 * - Calculations: useMemo prevents unnecessary recalculations
 * - Progress bar: Pure CSS animation (no layout thrashing)
 * 
 * Backend Optimization:
 * - Heartbeat: Lightweight POST (only updates timestamp)
 * - Cleanup: Batch operation (max 100 per cycle)
 * - Indexes: On (last_activity_at, completed_at) for cleanup queries
 *
 * ============================================================================
 * TESTING STRATEGY
 * ============================================================================
 * 
 * Unit Tests:
 * - ManageAvailabilityDialog: Correctly formats and sends slot config
 * - Timer calculations: Remaining time, percent used, warnings accurate
 * - Cleanup service: Correctly identifies abandoned sessions
 * 
 * Integration Tests:
 * - End-to-end: Doctor configures → books appointment → timer shows duration
 * - Heartbeat: Sent every 30 seconds, updates last_activity_at
 * - Recovery: Session marked abandoned after 60 min inactivity
 * 
 * E2E Tests:
 * - Doctor adjusts availability → schedule updates → new appointments respect config
 * - Appointment booking captures current slot_duration value
 * - Consultation timer correctly displays remaining time and warnings
 * - Overrun detection alerts doctor when exceeding slot time
 * 
 * ============================================================================
 * MIGRATION NOTES
 * ============================================================================
 * 
 * If migrating from old system:
 * 1. Ensure all Appointments have slot_duration or duration_minutes set
 * 2. Ensure all active Consultations have started_at set
 * 3. Add last_activity_at to Consultation (migration: 20260303_add_session_timeout_support)
 * 4. Test timer calculations with existing appointments
 * 
 * Legacy appointment without slot_duration:
 * - Migration should SET slot_duration = 30 WHERE slot_duration IS NULL
 * - Or use default value in schema:  @default(30)
 */

export const SLOT_CONFIGURATION_FLOW = {
  steps: [
    'Doctor configures availability (defaultDuration)',
    'Doctor creates schedule using slot config',
    'Patient books appointment (captures slot_duration)',
    'Appointment record immutable after creation',
    'Consultation room reads appointment.slot_duration',
    'Timer displays remaining time until slot end',
  ],
  invariants: [
    'appointment.slot_duration is immutable post-creation',
    'appointment.slot_start_time is immutable post-creation',
    'slotConfiguration.defaultDuration only affects NEW appointments',
    'Consultation.last_activity_at updated by heartbeat endpoint',
  ],
};
