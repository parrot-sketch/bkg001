import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ScheduleAppointmentDto } from '../dtos/ScheduleAppointmentDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: ScheduleAppointmentUseCase
 * 
 * Orchestrates the scheduling of a new appointment between a patient and doctor.
 * 
 * Business Purpose:
 * - Validates appointment availability (no double booking)
 * - Ensures patient and doctor exist
 * - Creates appointment record with PENDING status
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This use case is part of the appointment scheduling workflow:
 * 1. Patient registration → CreatePatientUseCase
 * 2. Appointment scheduling → ScheduleAppointmentUseCase (this)
 * 3. Check-in → CheckInPatientUseCase
 * 4. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Patient must exist
 * - Doctor must exist (validated by repository)
 * - Appointment date cannot be in the past
 * - No double booking (same doctor, same date/time)
 * - Appointment starts with PENDING status
 */
export class ScheduleAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    private readonly timeService: ITimeService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!patientRepository) {
      throw new Error('PatientRepository is required');
    }
    if (!notificationService) {
      throw new Error('NotificationService is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
    if (!timeService) {
      throw new Error('TimeService is required');
    }
  }

  /**
   * Executes the appointment scheduling use case
   * 
   * @param dto - ScheduleAppointmentDto with appointment scheduling data
   * @param userId - User ID performing the action (for audit purposes)
   * @returns Promise resolving to AppointmentResponseDto with created appointment data
   * @throws DomainException if validation fails or appointment conflicts exist
   */
  async execute(dto: ScheduleAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new DomainException(`Patient with ID ${dto.patientId} not found`, {
        patientId: dto.patientId,
      });
    }

    // Step 2: Validate appointment date is not in the past
    const now = this.timeService.now();
    const appointmentDateTime = new Date(dto.appointmentDate);
    appointmentDateTime.setHours(0, 0, 0, 0);
    
    if (appointmentDateTime < now) {
      throw new DomainException('Appointment date cannot be in the past', {
        appointmentDate: dto.appointmentDate,
        currentDate: now,
      });
    }

    // Step 3: Check for existing appointments (double booking check)
    // Check both patient and doctor appointments to prevent conflicts
    const [patientAppointments, doctorAppointments] = await Promise.all([
      this.appointmentRepository.findByPatient(dto.patientId),
      this.appointmentRepository.findByDoctor(dto.doctorId),
    ]);

    // Check patient appointments for same doctor/date/time
    const patientConflict = patientAppointments.find((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0);
      return (
        aptDate.getTime() === appointmentDateTime.getTime() &&
        apt.getDoctorId() === dto.doctorId &&
        apt.getTime() === dto.time &&
        apt.getStatus() !== AppointmentStatus.CANCELLED
      );
    });

    if (patientConflict) {
      throw new DomainException(
        `Appointment conflict: Patient already has an appointment with doctor ${dto.doctorId} on ${dto.appointmentDate.toISOString()} at ${dto.time}`,
        {
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          appointmentDate: dto.appointmentDate,
          time: dto.time,
        },
      );
    }

    // Check doctor appointments for same date/time (prevent double booking)
    const doctorConflict = doctorAppointments.find((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0);
      return (
        aptDate.getTime() === appointmentDateTime.getTime() &&
        apt.getTime() === dto.time &&
        apt.getStatus() !== AppointmentStatus.CANCELLED
      );
    });

    if (doctorConflict) {
      throw new DomainException(
        `Appointment conflict: Doctor ${dto.doctorId} already has an appointment on ${dto.appointmentDate.toISOString()} at ${dto.time}`,
        {
          doctorId: dto.doctorId,
          appointmentDate: dto.appointmentDate,
          time: dto.time,
        },
      );
    }

    // Step 4: Create appointment domain entity (validates business rules)
    // Note: ID will be 0 temporarily, database will assign actual ID
    const appointment = ApplicationAppointmentMapper.fromScheduleDto(
      dto,
      AppointmentStatus.PENDING,
      0, // Temporary ID, will be replaced after save
    );

    // Step 5: Save appointment to repository
    await this.appointmentRepository.save(appointment);

    // Step 6: Retrieve saved appointment to get the assigned ID
    // Note: This is a limitation - we need to refetch to get the ID
    // A better approach would be for save() to return the saved entity
    // For now, we'll use the patient's appointments to find the newly created one
    const allPatientAppointments = await this.appointmentRepository.findByPatient(dto.patientId);
    const savedAppointment = allPatientAppointments
      .filter((apt) => apt.getDoctorId() === dto.doctorId && apt.getAppointmentDate().getTime() === appointmentDateTime.getTime())
      .sort((a, b) => (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0))[0];

    if (!savedAppointment) {
      throw new Error('Failed to retrieve saved appointment');
    }

    // Step 7: Send notification to patient
    try {
      await this.notificationService.sendEmail(
        patient.getEmail(),
        'Appointment Scheduled',
        `Your appointment has been scheduled for ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}.`,
      );
    } catch (error) {
      // Notification failure should not break the use case
      // Log error but continue
      console.error('Failed to send appointment notification:', error);
    }

    // Step 8: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: savedAppointment.getId().toString(),
      action: 'CREATE',
      model: 'Appointment',
      details: `Scheduled appointment for patient ${patient.getFullName()} with doctor ${dto.doctorId} on ${dto.appointmentDate.toISOString()}`,
    });

    // Step 9: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(savedAppointment);
  }
}
