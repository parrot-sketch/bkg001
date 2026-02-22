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
import { PrismaClient } from '@prisma/client';
import { createNotification } from '@/lib/notifications/createNotification';
import { Role } from '@/domain/enums/Role';
import { format } from 'date-fns';

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
        private readonly prisma: PrismaClient,
    ) {
        if (!appointmentRepository) throw new Error('AppointmentRepository is required');
        if (!patientRepository) throw new Error('PatientRepository is required');
        if (!notificationService) throw new Error('NotificationService is required');
        if (!auditService) throw new Error('AuditService is required');
        if (!timeService) throw new Error('TimeService is required');
        if (!validateAvailabilityUseCase) throw new Error('ValidateAvailabilityUseCase is required');
        if (!prisma) throw new Error('PrismaClient is required');
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

        // Use the appointment's actual duration, or default to 30 minutes
        // The duration is stored in the appointment entity from when it was created
        const duration = appointment.getDurationMinutes() || 30;

        const availabilityResult = await this.validateAvailabilityUseCase.execute({
            doctorId: appointment.getDoctorId(),
            date: newDate,
            time: dto.newTime,
            duration: duration,
            excludeAppointmentId: appointment.getId() // Exclude the appointment being rescheduled from conflict check
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

        // 5b. Notify Frontdesk User (if appointment was created by frontdesk)
        try {
            const rawAppointment = await this.prisma.appointment.findUnique({
                where: { id: dto.appointmentId },
                include: {
                    created_by_user: {
                        select: {
                            id: true,
                            role: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    patient: {
                        select: {
                            first_name: true,
                            last_name: true,
                            file_number: true,
                        },
                    },
                    doctor: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            // If appointment was created by a frontdesk user, notify them
            if (
                rawAppointment?.created_by_user_id &&
                rawAppointment.created_by_user &&
                rawAppointment.created_by_user.role === Role.FRONTDESK
            ) {
                const patientName = rawAppointment.patient
                    ? `${rawAppointment.patient.first_name} ${rawAppointment.patient.last_name}`
                    : 'Patient';
                const doctorName = rawAppointment.doctor?.name || 'Doctor';

                await createNotification({
                    userId: rawAppointment.created_by_user_id,
                    type: 'IN_APP',
                    subject: 'Appointment Rescheduled',
                    message: `${patientName} (File: ${rawAppointment.patient?.file_number || 'N/A'}) appointment with ${doctorName} has been rescheduled.\n\n` +
                        `Old Time: ${oldDate.toLocaleDateString()} at ${oldTime}\n` +
                        `New Time: ${newDate.toLocaleDateString()} at ${dto.newTime}\n\n` +
                        `Please update your records and prepare for check-in on the new date.`,
                    metadata: {
                        resourceType: 'appointment',
                        resourceId: dto.appointmentId,
                        appointmentId: dto.appointmentId,
                        oldDate: oldDate.toISOString(),
                        oldTime,
                        newDate: newDate.toISOString(),
                        newDateFormatted: format(newDate, 'yyyy-MM-dd'),
                        newTime: dto.newTime,
                        reason: dto.reason,
                        // Add navigation hint for frontdesk appointments page
                        navigateTo: `/frontdesk/appointments?date=${format(newDate, 'yyyy-MM-dd')}&highlight=${dto.appointmentId}`,
                    },
                    senderId: userId,
                });
            }
        } catch (error) {
            console.error('Failed to notify frontdesk user of reschedule:', error);
            // Don't throw - notification failure shouldn't break rescheduling
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
