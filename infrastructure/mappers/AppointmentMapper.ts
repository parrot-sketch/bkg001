import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
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
   * @param prismaAppointment - Prisma Appointment model from database
   * @returns Domain Appointment entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaAppointment: PrismaAppointment): Appointment {
    return Appointment.create({
      id: prismaAppointment.id,
      patientId: prismaAppointment.patient_id,
      doctorId: prismaAppointment.doctor_id,
      appointmentDate: prismaAppointment.appointment_date,
      time: prismaAppointment.time,
      status: prismaAppointment.status as AppointmentStatus,
      type: prismaAppointment.type,
      note: prismaAppointment.note ?? undefined,
      reason: prismaAppointment.reason ?? undefined,
      createdAt: prismaAppointment.created_at,
      updatedAt: prismaAppointment.updated_at,
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
      status: appointment.getStatus(),
      type: appointment.getType(),
      note: appointment.getNote() ?? null,
      reason: appointment.getReason() ?? null,
      // Timestamps will be set by Prisma automatically
    };
  }

  /**
   * Maps a domain Appointment entity to Prisma AppointmentUpdateInput for updates
   * 
   * @param appointment - Domain Appointment entity with updated values
   * @returns Prisma AppointmentUpdateInput for updating an existing appointment
   */
  static toPrismaUpdateInput(appointment: Appointment): Prisma.AppointmentUpdateInput {
    const updateInput: Prisma.AppointmentUpdateInput = {
      appointment_date: appointment.getAppointmentDate(),
      time: appointment.getTime(),
      status: appointment.getStatus(),
      type: appointment.getType(),
    };

    // Handle optional fields - only include if they have values
    if (appointment.getNote() !== undefined) {
      updateInput.note = appointment.getNote() ?? null;
    }
    if (appointment.getReason() !== undefined) {
      updateInput.reason = appointment.getReason() ?? null;
    }

    // updated_at will be set by Prisma automatically
    return updateInput;
  }
}
