/**
 * Appointment Builder - Fluent API for Creating Test Appointments
 * 
 * Provides a clean, readable way to create test appointment objects.
 * Uses sensible defaults but allows full customization.
 * 
 * Example usage:
 *   const apt = new AppointmentBuilder()
 *     .withPatientId('pat-123')
 *     .withDoctorId('doc-456')
 *     .scheduledFor('2025-02-01', '14:30')
 *     .build();
 */

import { Appointment } from '@domain/entities/Appointment';
import { AppointmentStatus } from '@domain/enums/AppointmentStatus';
import { ConsultStatus } from '@domain/enums/ConsultStatus';

export class AppointmentBuilder {
  private patientId = 'patient-default';
  private doctorId = 'doctor-default';
  private appointmentDate = new Date('2025-02-01');
  private time = '14:30';
  private status = AppointmentStatus.SCHEDULED;
  private consultStatus = ConsultStatus.OPEN;
  private durationMinutes = 30;
  private notes = '';
  private checkedInAt: Date | null = null;
  private noShowReason: string | null = null;

  withPatientId(patientId: string): this {
    this.patientId = patientId;
    return this;
  }

  withDoctorId(doctorId: string): this {
    this.doctorId = doctorId;
    return this;
  }

  scheduledFor(date: string | Date, time: string): this {
    if (typeof date === 'string') {
      this.appointmentDate = new Date(date);
    } else {
      this.appointmentDate = date;
    }
    this.time = time;
    return this;
  }

  withStatus(status: AppointmentStatus): this {
    this.status = status;
    return this;
  }

  withConsultStatus(status: ConsultStatus): this {
    this.consultStatus = status;
    return this;
  }

  withDurationMinutes(duration: number): this {
    this.durationMinutes = duration;
    return this;
  }

  withNotes(notes: string): this {
    this.notes = notes;
    return this;
  }

  checkedIn(checkedInAt: Date): this {
    this.checkedInAt = checkedInAt;
    return this;
  }

  markedAsNoShow(reason: string): this {
    this.noShowReason = reason;
    this.status = AppointmentStatus.NO_SHOW;
    return this;
  }

  build(): Appointment {
    // Create an appointment using the domain entity constructor
    // This assumes the Appointment entity has a static factory method or we create it directly

    // For now, we'll use a simple object that matches the Appointment interface
    const appointmentData = {
      id: Math.floor(Math.random() * 100000),
      patient_id: this.patientId,
      doctor_id: this.doctorId,
      appointment_date: this.appointmentDate,
      time: this.time,
      status: this.status,
      consult_status: this.consultStatus,
      duration_minutes: this.durationMinutes,
      notes: this.notes,
      checked_in_at: this.checkedInAt,
      no_show_reason: this.noShowReason,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Return as Appointment type (in real implementation, construct proper entity)
    return appointmentData as unknown as Appointment;
  }
}
