import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { RecordVitalSignsUseCase } from '@/application/use-cases/RecordVitalSignsUseCase';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { Appointment } from '@/domain/entities/Appointment';
import { RecordVitalSignsDto } from '@/domain/interfaces/repositories/IVitalSignRepository';

describe('RecordVitalSignsUseCase', () => {
    let mockVitalSignRepo: { save: Mock };
    let mockAppointmentRepo: { findById: Mock; update: Mock };
    let mockAuditService: { recordEvent: Mock };
    let useCase: RecordVitalSignsUseCase;

    beforeEach(() => {
        mockVitalSignRepo = { save: vi.fn() };
        mockAppointmentRepo = { findById: vi.fn(), update: vi.fn() };
        mockAuditService = { recordEvent: vi.fn() };

        useCase = new RecordVitalSignsUseCase(
            mockVitalSignRepo as any,
            mockAppointmentRepo as any,
            mockAuditService as any
        );
    });

    const validDto: RecordVitalSignsDto = {
        patientId: 'patient-123',
        appointmentId: 101,
        bodyTemperature: 37.5,
        systolic: 120,
        diastolic: 80,
        heartRate: '75',
        recordedBy: 'nurse-789',
    };

    it('should save vital signs and update appointment status when appointmentId is provided', async () => {
        const appointment = Appointment.create({
            id: 101,
            patientId: 'patient-123',
            doctorId: 'doctor-456',
            appointmentDate: new Date(),
            time: '10:00',
            status: AppointmentStatus.CHECKED_IN,
            type: 'Consultation',
        });

        mockAppointmentRepo.findById.mockResolvedValue(appointment);
        mockVitalSignRepo.save.mockResolvedValue(undefined);
        mockAppointmentRepo.update.mockResolvedValue(undefined);

        await useCase.execute(validDto);

        // Verify vitals saved
        expect(mockVitalSignRepo.save).toHaveBeenCalledWith(validDto);

        // Verify appointment fetched and updated
        expect(mockAppointmentRepo.findById).toHaveBeenCalledWith(101);
        expect(mockAppointmentRepo.update).toHaveBeenCalledWith(expect.objectContaining({
            status: AppointmentStatus.READY_FOR_CONSULTATION
        }));

        // Verify audit events
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'nurse-789',
            action: 'UPDATE',
            model: 'Appointment'
        }));
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'nurse-789',
            action: 'CREATE',
            model: 'VitalSign'
        }));
    });

    it('should only save vital signs if no appointmentId is provided', async () => {
        const dtoWithoutApt = { ...validDto, appointmentId: undefined };
        
        mockVitalSignRepo.save.mockResolvedValue(undefined);

        await useCase.execute(dtoWithoutApt);

        expect(mockVitalSignRepo.save).toHaveBeenCalledWith(dtoWithoutApt);
        expect(mockAppointmentRepo.findById).not.toHaveBeenCalled();
        expect(mockAppointmentRepo.update).not.toHaveBeenCalled();
        
        // Should still record audit for vitals
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
            action: 'CREATE',
            model: 'VitalSign'
        }));
    });

    it('should throw error if appointment is not found', async () => {
        mockAppointmentRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('not found');
    });
});
