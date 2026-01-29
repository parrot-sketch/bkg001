/**
 * Fake Appointment Repository - In-Memory Implementation
 * 
 * Used for testing without database dependencies.
 * Implements IAppointmentRepository interface with in-memory storage.
 */

import { Appointment } from '@domain/entities/Appointment';
import { AppointmentStatus } from '@domain/enums/AppointmentStatus';
import { IAppointmentRepository } from '@domain/interfaces/repositories/IAppointmentRepository';

export class FakeAppointmentRepository implements IAppointmentRepository {
  private appointments: Map<number, Appointment> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<Appointment | null> {
    return this.appointments.get(id) || null;
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    const results: Appointment[] = [];
    this.appointments.forEach((apt) => {
      const id = (apt as any).patient_id || (apt as any).getPatientId?.();
      if (id === patientId) {
        results.push(apt);
      }
    });
    return results;
  }

  async findByDoctor(
    doctorId: string,
    filters?: {
      status?: AppointmentStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Appointment[]> {
    const results: Appointment[] = [];
    this.appointments.forEach((apt) => {
      const docId = (apt as any).doctor_id || (apt as any).getDoctorId?.();
      if (docId !== doctorId) return;

      if (filters?.status) {
        const aptStatus = (apt as any).status || (apt as any).getStatus?.();
        if (aptStatus !== filters.status) return;
      }

      if (filters?.startDate || filters?.endDate) {
        // Simplified date range check
        // In real implementation, use appointment_date field
        const aptDate = new Date((apt as any).appointment_date);
        if (filters.startDate && aptDate < filters.startDate) return;
        if (filters.endDate && aptDate > filters.endDate) return;
      }

      results.push(apt);
    });
    return results;
  }

  async findPotentialNoShows(now: Date, windowMinutes: number): Promise<Appointment[]> {
    const results: Appointment[] = [];
    const threshold = new Date(now.getTime() - windowMinutes * 60000);

    this.appointments.forEach((apt) => {
      const status = (apt as any).status || (apt as any).getStatus?.();
      if (status !== AppointmentStatus.SCHEDULED) return;

      const aptDate = new Date((apt as any).appointment_date);
      if (aptDate <= threshold) {
        results.push(apt);
      }
    });

    return results;
  }

  async hasConflict(
    doctorId: string,
    appointmentDate: Date,
    time: string,
    txClient?: unknown
  ): Promise<boolean> {
    for (const apt of this.appointments.values()) {
      const docId = (apt as any).doctor_id || (apt as any).getDoctorId?.();
      const status = (apt as any).status || (apt as any).getStatus?.();

      if (
        docId === doctorId &&
        status !== AppointmentStatus.CANCELLED &&
        status !== AppointmentStatus.NO_SHOW
      ) {
        const aptDate = new Date((apt as any).appointment_date);
        const aptTime = (apt as any).time;

        // Simple comparison
        if (aptDate.toDateString() === appointmentDate.toDateString() && aptTime === time) {
          return true;
        }
      }
    }
    return false;
  }

  async save(
    appointment: Appointment,
    consultationRequestFields?: unknown,
    txClient?: unknown
  ): Promise<number> {
    const id = this.nextId++;
    // Store a copy to avoid external mutations
    this.appointments.set(id, appointment);
    return id;
  }

  async update(
    appointment: Appointment,
    consultationRequestFields?: unknown
  ): Promise<void> {
    // Find existing by comparing entity properties
    // In a real repo, use the ID from the appointment
    for (const [id, stored] of this.appointments.entries()) {
      if (stored.getId && stored.getId() === (appointment.getId && appointment.getId())) {
        this.appointments.set(id, appointment);
        return;
      }
    }
    // If not found, add it
    this.appointments.set(this.nextId++, appointment);
  }

  async delete(id: number): Promise<void> {
    this.appointments.delete(id);
  }

  // Test utility: Get all appointments
  getAllAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  // Test utility: Clear all data
  clear(): void {
    this.appointments.clear();
    this.nextId = 1;
  }

  // Test utility: Get current ID counter
  getNextId(): number {
    return this.nextId;
  }

  async getConsultationRequestFields(appointmentId: number): Promise<unknown | null> {
    return null;
  }
}
