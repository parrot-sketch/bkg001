import { describe, it, expect } from 'vitest';
import { Appointment } from '@/domain/entities/Appointment';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { DomainException } from '@/domain/exceptions/DomainException';

describe('Appointment Entity', () => {
    const baseParams = {
        id: 1,
        patientId: 'patient-123',
        doctorId: 'doctor-456',
        appointmentDate: new Date(),
        time: '10:00',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
    };

    describe('markReadyForConsultation', () => {
        it('should allow transitioning from CHECKED_IN to READY_FOR_CONSULTATION', () => {
            const appointment = Appointment.create({
                ...baseParams,
                status: AppointmentStatus.CHECKED_IN,
            });

            const updated = appointment.markReadyForConsultation();

            expect(updated.getStatus()).toBe(AppointmentStatus.READY_FOR_CONSULTATION);
        });

        it('should throw DomainException if status is not CHECKED_IN', () => {
            const appointment = Appointment.create({
                ...baseParams,
                status: AppointmentStatus.SCHEDULED,
            });

            expect(() => appointment.markReadyForConsultation()).toThrow(DomainException);
            expect(() => appointment.markReadyForConsultation()).toThrow('Patient must be checked in first');
        });

        it('should update status_changed_at when marking as ready', () => {
            const appointment = Appointment.create({
                ...baseParams,
                status: AppointmentStatus.CHECKED_IN,
            });

            const updated = appointment.markReadyForConsultation();
            
            expect(updated.getStatusChangedAt()).toBeDefined();
            expect(updated.getStatusChangedAt()).toBeInstanceOf(Date);
        });
    });
});
