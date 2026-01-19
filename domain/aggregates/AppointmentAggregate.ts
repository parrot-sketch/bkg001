import { Appointment } from '../entities/Appointment';
import { AppointmentStatus } from '../enums/AppointmentStatus';
import { CheckInInfo } from '../value-objects/CheckInInfo';
import { NoShowInfo } from '../value-objects/NoShowInfo';
import { NoShowReason } from '../enums/NoShowReason';
import { DomainException } from '../exceptions/DomainException';

/**
 * Aggregate: AppointmentAggregate
 * 
 * Root aggregate for appointment lifecycle management.
 * Ensures consistency between Appointment entity and related value objects.
 * 
 * Consistency Boundary:
 * - Appointment entity
 * - Check-in information
 * - No-show information
 * 
 * Invariants:
 * - Appointment cannot be both checked in and no-show
 * - Late arrival calculation must be accurate
 * - No-show auto-detection must respect threshold
 * - Status must be consistent with check-in/no-show state
 */
export class AppointmentAggregate {
  private constructor(
    private readonly appointment: Appointment,
  ) {
    // Aggregate invariants enforced in constructor
    if (this.appointment.isCheckedIn() && this.appointment.isNoShow()) {
      throw new DomainException(
        'Appointment cannot be both checked in and marked as no-show',
        { appointmentId: this.appointment.getId() }
      );
    }
  }

  /**
   * Creates an AppointmentAggregate
   * 
   * @param appointment - Appointment entity
   * @returns AppointmentAggregate
   */
  static create(appointment: Appointment): AppointmentAggregate {
    return new AppointmentAggregate(appointment);
  }

  /**
   * Gets the appointment entity
   */
  getAppointment(): Appointment {
    return this.appointment;
  }

  /**
   * Checks in the patient
   * 
   * Automatically calculates late arrival based on appointment time vs check-in time.
   * 
   * Invariants:
   * - Cannot check in if already checked in (idempotency)
   * - Cannot check in if marked as no-show
   * - Late arrival calculated accurately
   * 
   * @param checkedInAt - When patient checked in
   * @param checkedInBy - User ID who checked in patient
   * @returns New AppointmentAggregate with check-in applied
   * @throws DomainException if check-in is not allowed
   */
  checkIn(checkedInAt: Date, checkedInBy: string): AppointmentAggregate {
    // Calculate late arrival
    const appointmentDateTime = this.getAppointmentDateTime();
    const minutesLate = Math.floor((checkedInAt.getTime() - appointmentDateTime.getTime()) / (1000 * 60));

    let checkInInfo: CheckInInfo;
    if (minutesLate > 0) {
      // Late arrival
      checkInInfo = CheckInInfo.createLate({
        checkedInAt,
        checkedInBy,
        lateByMinutes: minutesLate,
      });
    } else {
      // On-time arrival
      checkInInfo = CheckInInfo.createOnTime({
        checkedInAt,
        checkedInBy,
      });
    }

    const updatedAppointment = this.appointment.checkIn(checkInInfo);
    return new AppointmentAggregate(updatedAppointment);
  }

  /**
   * Marks appointment as no-show (manual)
   * 
   * Invariants:
   * - Cannot mark if already checked in
   * - Cannot mark if already marked (idempotency)
   * - Reason must be provided
   * 
   * @param reason - No-show reason
   * @param notes - Optional notes
   * @param detectedBy - User ID who marked as no-show (undefined for auto)
   * @returns New AppointmentAggregate with no-show applied
   * @throws DomainException if marking no-show is not allowed
   */
  markAsNoShow(
    reason: NoShowReason,
    notes?: string,
    detectedBy?: string
  ): AppointmentAggregate {
    const noShowInfo = NoShowInfo.create({
      noShowAt: new Date(),
      reason,
      notes,
    });

    const updatedAppointment = this.appointment.markAsNoShow(noShowInfo);
    return new AppointmentAggregate(updatedAppointment);
  }

  /**
   * Auto-detects no-show based on threshold
   * 
   * Invariants:
   * - Only triggers after threshold has passed
   * - Idempotent (can be called multiple times safely)
   * - Never overrides checked-in appointment
   * - Only applies to appointments that can be marked as no-show
   * 
   * @param now - Current date/time
   * @param thresholdMinutes - Minutes after appointment time to trigger
   * @returns New AppointmentAggregate with no-show applied, or same aggregate if conditions not met
   * @throws DomainException if auto-detection is not allowed
   */
  autoDetectNoShow(now: Date, thresholdMinutes: number): AppointmentAggregate {
    // Invariant: Never override checked-in appointment
    if (this.appointment.isCheckedIn()) {
      return this; // Idempotent: return unchanged if already checked in
    }

    // Invariant: Idempotent - if already marked, return unchanged
    if (this.appointment.isNoShow()) {
      return this;
    }

    // Invariant: Only trigger after threshold
    const appointmentDateTime = this.getAppointmentDateTime();
    const minutesSinceAppointment = Math.floor((now.getTime() - appointmentDateTime.getTime()) / (1000 * 60));

    if (minutesSinceAppointment < thresholdMinutes) {
      // Threshold not met, return unchanged
      return this;
    }

    // Invariant: Only apply to appointments that can be marked as no-show
    if (!this.canBeMarkedAsNoShow()) {
      return this;
    }

    // Auto-detect no-show
    const noShowInfo = NoShowInfo.create({
      noShowAt: now,
      reason: NoShowReason.AUTO,
      notes: `Automatically detected ${minutesSinceAppointment} minutes after appointment time`,
    });

    const updatedAppointment = this.appointment.markAsNoShow(noShowInfo);
    return new AppointmentAggregate(updatedAppointment);
  }

  /**
   * Reverses no-show when patient arrives late
   * 
   * This handles the case where a patient is marked as no-show but then arrives.
   * The no-show is cleared and check-in is applied.
   * 
   * Invariants:
   * - Must have no-show to reverse
   * - Check-in replaces no-show
   * 
   * @param checkedInAt - When patient checked in
   * @param checkedInBy - User ID who checked in patient
   * @returns New AppointmentAggregate with no-show reversed and check-in applied
   * @throws DomainException if no-show cannot be reversed
   */
  reverseNoShowWithCheckIn(checkedInAt: Date, checkedInBy: string): AppointmentAggregate {
    // Must have no-show to reverse
    if (!this.appointment.isNoShow()) {
      throw new DomainException('Cannot reverse no-show: appointment is not marked as no-show', {
        appointmentId: this.appointment.getId(),
      });
    }

    // Calculate late arrival
    const appointmentDateTime = this.getAppointmentDateTime();
    const minutesLate = Math.floor((checkedInAt.getTime() - appointmentDateTime.getTime()) / (1000 * 60));

    let checkInInfo: CheckInInfo;
    if (minutesLate > 0) {
      checkInInfo = CheckInInfo.createLate({
        checkedInAt,
        checkedInBy,
        lateByMinutes: minutesLate,
      });
    } else {
      checkInInfo = CheckInInfo.createOnTime({
        checkedInAt,
        checkedInBy,
      });
    }

    // Create new appointment with check-in but without no-show
    // We need to create a new appointment without noShowInfo
    const updatedAppointment = Appointment.create({
      id: this.appointment.getId(),
      patientId: this.appointment.getPatientId(),
      doctorId: this.appointment.getDoctorId(),
      appointmentDate: this.appointment.getAppointmentDate(),
      time: this.appointment.getTime(),
      status: this.appointment.getStatus() === AppointmentStatus.NO_SHOW
        ? AppointmentStatus.SCHEDULED
        : this.appointment.getStatus(),
      type: this.appointment.getType(),
      note: this.appointment.getNote(),
      reason: this.appointment.getReason(),
      checkInInfo,
      noShowInfo: undefined, // Clear no-show
      rescheduledToAppointmentId: this.appointment.getRescheduledToAppointmentId(),
      createdAt: this.appointment.getCreatedAt(),
      updatedAt: new Date(),
    });

    return new AppointmentAggregate(updatedAppointment);
  }

  /**
   * Checks if appointment can be marked as no-show
   */
  private canBeMarkedAsNoShow(): boolean {
    const status = this.appointment.getStatus();
    return (
      status === AppointmentStatus.PENDING ||
      status === AppointmentStatus.SCHEDULED ||
      status === AppointmentStatus.CONFIRMED
    );
  }

  /**
   * Gets appointment date and time as a single Date object
   */
  private getAppointmentDateTime(): Date {
    const date = this.appointment.getAppointmentDate();
    const time = this.appointment.getTime();
    
    // Parse time string (format: "HH:mm" or "HH:mm AM/PM")
    let hours: number;
    let minutes: number;
    
    if (time.includes('AM') || time.includes('PM')) {
      // Handle 12-hour format
      const [timePart, period] = time.split(/\s*(AM|PM)/i);
      const [h, m] = timePart.split(':').map(Number);
      hours = h === 12 ? (period.toUpperCase() === 'AM' ? 0 : 12) : (period.toUpperCase() === 'PM' ? h + 12 : h);
      minutes = m || 0;
    } else {
      // Handle 24-hour format
      const parts = time.split(':');
      hours = Number.parseInt(parts[0], 10);
      minutes = parts[1] ? Number.parseInt(parts[1], 10) : 0;
    }
    
    // Create new date using the appointment date's year, month, day
    // and set the time components
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }
}
