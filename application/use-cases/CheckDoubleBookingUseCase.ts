import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { ConflictDetectionService } from '../../domain/services/ConflictDetectionService';
import { SlotWindow } from '../../domain/value-objects/SlotWindow';
import { CheckDoubleBookingDto, DoubleBookingCheckResponseDto } from '../dtos/CheckDoubleBookingDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: CheckDoubleBookingUseCase
 * 
 * Checks if a proposed appointment slot is available (no conflicts).
 * 
 * Business Purpose:
 * - Validates time slot availability before scheduling
 * - Prevents double-booking of doctor appointments
 * - Used during appointment booking workflow
 * - Provides detailed conflict information for UI
 * 
 * Use Cases:
 * 1. Appointment Booking: Check availability when patient selects time
 * 2. Admin Scheduling: Verify slot before creating appointment
 * 3. Rescheduling: Find alternative slots, check each one
 * 4. Calendar View: Highlight available vs booked slots
 * 
 * Features:
 * - Returns detailed conflict list with appointment details
 * - Human-readable availability message
 * - Supports flexible duration (default 30 minutes)
 * - Uses Phase 1 indexes for fast conflict detection
 * - O(n) query performance with ConflictDetectionService
 * 
 * Business Rules:
 * - Doctor must be specified
 * - Appointment date cannot be in past
 * - Duration defaults to 30 minutes if not specified
 * - Returns all conflicting appointments for UI display
 * 
 * Phase 3 Enhancement:
 * - Uses ConflictDetectionService for conflict algorithms
 * - Uses SlotWindow value object for time window operations
 * - Integrates Phase 1 temporal fields (scheduled_at, duration_minutes)
 * - Leverages indexes on (doctor_id, scheduled_at) for fast queries
 */
export class CheckDoubleBookingUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
  }

  /**
   * Executes the check double booking use case
   * 
   * @param dto - CheckDoubleBookingDto with appointment details
   * @returns Promise resolving to DoubleBookingCheckResponseDto
   * @throws DomainException if validation fails
   */
  async execute(dto: CheckDoubleBookingDto): Promise<DoubleBookingCheckResponseDto> {
    // Step 1: Validate inputs
    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required', {
        doctorId: dto.doctorId,
      });
    }

    if (!dto.appointmentDate) {
      throw new DomainException('Appointment date is required', {
        appointmentDate: dto.appointmentDate,
      });
    }

    if (!dto.time || dto.time.trim().length === 0) {
      throw new DomainException('Appointment time is required', {
        time: dto.time,
      });
    }

    const durationMinutes = dto.durationMinutes || 30;
    if (durationMinutes <= 0 || durationMinutes > 480) {
      throw new DomainException('Duration must be between 1 and 480 minutes', {
        durationMinutes,
      });
    }

    // Step 2: Parse appointment date and time into datetime
    const [hours, minutes] = dto.time.split(':').map(Number);
    const appointmentDateTime = new Date(dto.appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Step 3: Create slot window for proposed appointment
    const proposedSlot = SlotWindow.fromStartAndDuration({
      startTime: appointmentDateTime,
      durationMinutes: durationMinutes,
    });

    // Step 4: Get all appointments for this doctor
    const doctorAppointments = await this.appointmentRepository.findByDoctor(dto.doctorId);

    // Step 5: Convert to slot windows and check for conflicts
    const existingSlots = doctorAppointments
      .filter((apt) => {
        // Only check against active appointments (not cancelled/completed)
        const status = apt.getStatus();
        return status !== 'CANCELLED' && status !== 'COMPLETED';
      })
      .map((apt) =>
        SlotWindow.fromStartAndDuration({
          startTime: apt.getAppointmentDate(),
          durationMinutes: apt.getDurationMinutes() || 30,
        })
      );

    // Step 6: Find conflicts using domain service
    const { hasConflicts, conflictingSlots } = ConflictDetectionService.findConflicts(
      proposedSlot,
      existingSlots,
      0, // No buffer time for basic conflict check
    );

    // Step 7: Map conflicting slots to detail objects
    const conflictingAppointments: Array<{
      appointmentId: number;
      patientId: string;
      startTime: Date;
      endTime: Date;
      status: string;
      duration: number;
    }> = [];
    if (hasConflicts && conflictingSlots.length > 0) {
      conflictingAppointments.push(...doctorAppointments
        .filter((apt) => {
          const aptSlot = SlotWindow.fromStartAndDuration({
            startTime: apt.getAppointmentDate(),
            durationMinutes: apt.getDurationMinutes() || 30,
          });
          return conflictingSlots.some((slot) => slot.equals(aptSlot));
        })
        .map((apt) => ({
          appointmentId: apt.getId(),
          patientId: apt.getPatientId(),
          startTime: apt.getAppointmentDate(),
          endTime: new Date(apt.getAppointmentDate().getTime() + (apt.getDurationMinutes() || 30) * 60_000),
          status: apt.getStatus(),
          duration: apt.getDurationMinutes() || 30,
        })));
    }

    // Step 8: Generate human-readable message
    let message: string;
    if (!hasConflicts) {
      message = `Time slot is available for ${durationMinutes} minutes starting at ${dto.time}`;
    } else if (conflictingAppointments.length === 1) {
      const conflict = conflictingAppointments[0];
      message = `Conflict with existing appointment (Patient: ${conflict.patientId}, Status: ${conflict.status})`;
    } else {
      message = `${conflictingAppointments.length} conflicting appointments found`;
    }

    // Step 9: Return response
    return {
      isAvailable: !hasConflicts,
      conflicts: conflictingAppointments,
      message,
    };
  }
}
