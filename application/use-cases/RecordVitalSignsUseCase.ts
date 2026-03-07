import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IVitalSignRepository, RecordVitalSignsDto } from '../../domain/interfaces/repositories/IVitalSignRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { DomainException } from '../../domain/exceptions/DomainException';
import { AppointmentMapper } from '../mappers/AppointmentMapper';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';

/**
 * Use Case: RecordVitalSignsUseCase
 * 
 * Orchestrates recording vital signs and transitioning appointment status.
 */
export class RecordVitalSignsUseCase {
    constructor(
        private readonly vitalSignRepository: IVitalSignRepository,
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly auditService: IAuditService
    ) { }

    async execute(dto: RecordVitalSignsDto): Promise<void> {
        // 1. Record Vital Signs
        await this.vitalSignRepository.save(dto);

        // 2. If appointmentId provided, transition status
        if (dto.appointmentId) {
            const appointment = await this.appointmentRepository.findById(dto.appointmentId);

            if (!appointment) {
                throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`);
            }

            // Transition to READY_FOR_CONSULTATION
            const updatedAppointment = appointment.markReadyForConsultation();

            // Save updated appointment
            await this.appointmentRepository.update(updatedAppointment);

            // 3. Record Audit Event
            await this.auditService.recordEvent({
                userId: dto.recordedBy,
                recordId: dto.appointmentId.toString(),
                action: 'UPDATE',
                model: 'Appointment',
                details: `Vitals recorded. Status transitioned to READY_FOR_CONSULTATION.`,
            });
        }

        // 4. Record Audit Event for Vitals (General)
        await this.auditService.recordEvent({
            userId: dto.recordedBy,
            recordId: dto.patientId,
            action: 'CREATE',
            model: 'VitalSign',
            details: `Vital signs recorded for patient ${dto.patientId}.`,
        });
    }
}
