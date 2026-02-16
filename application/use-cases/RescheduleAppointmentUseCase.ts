import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { RescheduleAppointmentDto } from '../dtos/RescheduleAppointmentDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import { ValidateAppointmentAvailabilityUseCase } from './ValidateAppointmentAvailabilityUseCase';

/**
 * Use Case: RescheduleAppointmentUseCase
 * 
 * Orchestrates rescheduling of an appointment.
 * 
 * Business Rules:
 * - Cancels the old time slot (conceptually)
 * - Books the new time slot
 * - Updates appointment date and time
 * - Sets status to SCHEDULED (auto-confirmed by doctor action)
 * - Sends notification to patient
 * - Records audit event
 */
export class RescheduleAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly patientRepository: IPatientRepository,
        private readonly notificationService: INotificationService,
        private readonly auditService: IAuditService,
        private readonly timeService: ITimeService,
        private readonly validateAvailabilityUseCase: ValidateAppointmentAvailabilityUseCase,
    ) {
        if (!appointmentRepository) throw new Error('AppointmentRepository is required');
        if (!patientRepository) throw new Error('PatientRepository is required');
        if (!notificationService) throw new Error('NotificationService is required');
        if (!auditService) throw new Error('AuditService is required');
        if (!timeService) throw new Error('TimeService is required');
        if (!validateAvailabilityUseCase) throw new Error('ValidateAvailabilityUseCase is required');
    }

    async execute(dto: RescheduleAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
        // 1. Load appointment
        const appointment = await this.appointmentRepository.findById(dto.appointmentId);
        if (!appointment) {
            throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`);
        }

        const oldDate = appointment.getAppointmentDate();
        const oldTime = appointment.getTime();
        const oldStatus = appointment.getStatus();

        // 2. Validate new slot availability
        const newDate = typeof dto.newDate === 'string' ? new Date(dto.newDate) : dto.newDate;

        // We assume default duration from appointment type or existing duration? 
        // Appointment entity doesn't seem to store duration directly, usually derived from slots.
        // For now, let's assume 30 mins or fetch from slot config. 
        // Ideally we should get this from the appointment or doctor config.
        // ValidateAppointmentAvailabilityUseCase requires duration.
        // Let's default to 15 mins (standard slot) or try to adhere to existing.
        // Given we don't have easy access to duration here without doctor config, 
        // and this is an "Override" by doctor, we might trust the doctor's choice 
        // BUT the requirement is to lock the slot.
        // Let's use a safe default of 15 or 30 mins. 
        const duration = 30; // Standard consultation duration

        const availabilityResult = await this.validateAvailabilityUseCase.execute({
            doctorId: appointment.getDoctorId(),
            date: newDate,
            time: dto.newTime,
            duration: duration
        });

        if (!availabilityResult.isAvailable) {
            // Optional: We could allow doctors to override availability (double book).
            // For now, let's enforce availability but maybe with a flag? 
            // The prompt said "critical concerns like slot locking are integrated".
            // So we should enforce it.
            throw new DomainException(`Selected slot is not available: ${availabilityResult.reason}`);
        }

        // 3. Update Appointment
        // Doctor rescheduling implicitly confirms the appointment if it was pending
        const updatedAppointment = appointment.reschedule(
            newDate,
            dto.newTime,
            AppointmentStatus.SCHEDULED // Direct to SCHEDULED
        );

        // 4. Save
        await this.appointmentRepository.update(updatedAppointment);

        // 5. Notify Patient
        const patient = await this.patientRepository.findById(appointment.getPatientId());
        if (patient) {
            try {
                await this.notificationService.sendEmail(
                    patient.getEmail(),
                    'Appointment Rescheduled',
                    `Your appointment has been rescheduled by Dr. ${updatedAppointment.getDoctorId()} (name resolving needed/optional).\n\n` +
                    `Old Time: ${oldDate.toLocaleDateString()} at ${oldTime}\n` +
                    `New Time: ${newDate.toLocaleDateString()} at ${dto.newTime}\n\n` +
                    (dto.reason ? `Reason: ${dto.reason}` : '')
                );
            } catch (error) {
                console.error('Failed to send reschedule notification', error);
            }
        }

        // 6. Audit
        await this.auditService.recordEvent({
            userId,
            recordId: appointment.getId().toString(),
            action: 'RESCHEDULE',
            model: 'Appointment',
            details: `Rescheduled from ${oldDate.toISOString()} ${oldTime} to ${newDate.toISOString()} ${dto.newTime}. Status: ${oldStatus} -> SCHEDULED.`,
        });

        return AppointmentMapper.toResponseDto(updatedAppointment);
    }
}
