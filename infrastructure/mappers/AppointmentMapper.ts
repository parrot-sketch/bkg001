import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { CheckInInfo } from '../../domain/value-objects/CheckInInfo';
import { NoShowInfo } from '../../domain/value-objects/NoShowInfo';
import { NoShowReason } from '../../domain/enums/NoShowReason';
import { Prisma, Appointment as PrismaAppointment } from '@prisma/client';
import { extractConsultationRequestFields, ConsultationRequestFields } from './ConsultationRequestMapper';

/**
 * Mapper: AppointmentMapper
 * 
 * Maps between Prisma Appointment model and domain Appointment entity.
 * This mapper handles the translation between infrastructure (Prisma) and domain layers.
 * 
 * Responsibilities:
 * - Convert Prisma snake_case to domain camelCase
 * - Convert Prisma enums to domain enums
 * - Handle optional fields and null values
 * - No business logic - only data translation
 */
export class AppointmentMapper {
  /**
   * Maps a Prisma Appointment model to a domain Appointment entity
   * 
   * Note: The current Appointment entity doesn't include CheckInInfo and NoShowInfo yet.
   * These fields are available in Prisma but will be added to the entity in a future enhancement.
   * 
   * @param prismaAppointment - Prisma Appointment model from database
   * @returns Domain Appointment entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaAppointment: PrismaAppointment & {
    no_show?: boolean;
  }): Appointment {
    // Map status - if no_show is true, use NO_SHOW status
    let status = prismaAppointment.status as AppointmentStatus;
    if (prismaAppointment.no_show && status !== AppointmentStatus.NO_SHOW) {
      status = AppointmentStatus.NO_SHOW;
    }

    return Appointment.create({
      id: prismaAppointment.id,
      patientId: prismaAppointment.patient_id,
      doctorId: prismaAppointment.doctor_id,
      appointmentDate: prismaAppointment.appointment_date,
      time: prismaAppointment.time,
      status,
      type: prismaAppointment.type,
      note: prismaAppointment.note ?? undefined,
      reason: prismaAppointment.reason ?? undefined,
      createdAt: prismaAppointment.created_at,
      updatedAt: prismaAppointment.updated_at,
    });
  }

  /**
   * Extracts CheckInInfo from Prisma Appointment model
   * 
   * Helper method for extracting check-in information.
   * This will be used when Appointment entity is enhanced with CheckInInfo.
   * 
   * @param prismaAppointment - Prisma Appointment model from database
   * @returns CheckInInfo value object if check-in exists, null otherwise
   */
  static extractCheckInInfo(prismaAppointment: PrismaAppointment & {
    late_arrival?: boolean;
    late_by_minutes?: number | null;
  }): CheckInInfo | null {
    if (!prismaAppointment.checked_in_at || !prismaAppointment.checked_in_by) {
      return null;
    }

    if (prismaAppointment.late_arrival && prismaAppointment.late_by_minutes) {
      return CheckInInfo.createLate({
        checkedInAt: prismaAppointment.checked_in_at,
        checkedInBy: prismaAppointment.checked_in_by,
        lateByMinutes: prismaAppointment.late_by_minutes,
      });
    }

    return CheckInInfo.createOnTime({
      checkedInAt: prismaAppointment.checked_in_at,
      checkedInBy: prismaAppointment.checked_in_by,
    });
  }

  /**
   * Extracts NoShowInfo from Prisma Appointment model
   * 
   * Helper method for extracting no-show information.
   * This will be used when Appointment entity is enhanced with NoShowInfo.
   * 
   * @param prismaAppointment - Prisma Appointment model from database
   * @returns NoShowInfo value object if no-show exists, null otherwise
   */
  static extractNoShowInfo(prismaAppointment: PrismaAppointment & {
    no_show?: boolean;
    no_show_at?: Date | null;
    no_show_reason?: string | null;
    no_show_notes?: string | null;
  }): NoShowInfo | null {
    if (!prismaAppointment.no_show || !prismaAppointment.no_show_at || !prismaAppointment.no_show_reason) {
      return null;
    }

    return NoShowInfo.create({
      noShowAt: prismaAppointment.no_show_at,
      reason: prismaAppointment.no_show_reason as NoShowReason,
      notes: prismaAppointment.no_show_notes ?? undefined,
    });
  }

  /**
   * Maps a domain Appointment entity to Prisma AppointmentCreateInput for creation
   * 
   * @param appointment - Domain Appointment entity
   * @returns Prisma AppointmentCreateInput for creating a new appointment
   */
  static toPrismaCreateInput(appointment: Appointment): Prisma.AppointmentCreateInput {
    return {
      patient: {
        connect: { id: appointment.getPatientId() },
      },
      doctor: {
        connect: { id: appointment.getDoctorId() },
      },
      appointment_date: appointment.getAppointmentDate(),
      time: appointment.getTime(),
      status: appointment.getStatus() as any,
      type: appointment.getType(),
      note: appointment.getNote() ?? null,
      reason: appointment.getReason() ?? null,
      // Timestamps will be set by Prisma automatically
    };
  }

  /**
   * Maps a domain Appointment entity to Prisma AppointmentUpdateInput for updates
   * 
   * Note: CheckInInfo and NoShowInfo are not yet part of the Appointment entity.
   * When enhanced, this method will need to be updated to include these fields.
   * 
   * @param appointment - Domain Appointment entity with updated values
   * @param checkInInfo - Optional CheckInInfo to include in update
   * @param noShowInfo - Optional NoShowInfo to include in update
   * @returns Prisma AppointmentUpdateInput for updating an existing appointment
   */
  static toPrismaUpdateInput(
    appointment: Appointment,
    checkInInfo?: CheckInInfo | null,
    noShowInfo?: NoShowInfo | null
  ): Prisma.AppointmentUpdateInput {
    const updateInput: Prisma.AppointmentUpdateInput & {
      late_arrival?: boolean;
      late_by_minutes?: number | null;
      no_show?: boolean;
      no_show_at?: Date | null;
      no_show_reason?: string | null;
      no_show_notes?: string | null;
    } = {
      appointment_date: appointment.getAppointmentDate(),
      time: appointment.getTime(),
      status: appointment.getStatus() as any,
      type: appointment.getType(),
    };

    // Handle optional fields - only include if they have values
    if (appointment.getNote() !== undefined) {
      updateInput.note = appointment.getNote() ?? null;
    }
    if (appointment.getReason() !== undefined) {
      updateInput.reason = appointment.getReason() ?? null;
    }

    // Handle check-in info if provided
    if (checkInInfo !== undefined) {
      if (checkInInfo) {
        updateInput.checked_in_at = checkInInfo.getCheckedInAt();
        updateInput.checked_in_by = checkInInfo.getCheckedInBy();
        updateInput.late_arrival = checkInInfo.isLate();
        updateInput.late_by_minutes = checkInInfo.getLateByMinutes() ?? null;
      } else {
        // Clear check-in info
        updateInput.checked_in_at = null;
        updateInput.checked_in_by = null;
        updateInput.late_arrival = false;
        updateInput.late_by_minutes = null;
      }
    }

    // Handle no-show info if provided
    if (noShowInfo !== undefined) {
      if (noShowInfo) {
        updateInput.no_show = true;
        updateInput.no_show_at = noShowInfo.getNoShowAt();
        updateInput.no_show_reason = noShowInfo.getReason();
        updateInput.no_show_notes = noShowInfo.getNotes() ?? null;
      } else {
        // Clear no-show info
        updateInput.no_show = false;
        updateInput.no_show_at = null;
        updateInput.no_show_reason = null;
        updateInput.no_show_notes = null;
      }
    }

    // updated_at will be set by Prisma automatically
    return updateInput;
  }
}
