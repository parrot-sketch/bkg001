import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { isValidConsultationRequestTransition } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { CreateConsultationFromFrontdeskDto } from '../dtos/CreateConsultationFromFrontdeskDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: CreateConsultationFromFrontdeskUseCase
 * 
 * Orchestrates the creation of a consultation request by frontdesk staff.
 * 
 * Business Purpose:
 * - Creates appointment with consultation_request_status = APPROVED (frontdesk pre-approves)
 * - Validates patient exists
 * - Validates doctor availability
 * - Pre-sets appointment date/time (unlike patient-initiated which requires review)
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This skips the review step since frontdesk is creating it directly:
 * 1. Frontdesk creates consultation → CreateConsultationFromFrontdeskUseCase (this)
 *    └─ Status set to APPROVED with appointment already scheduled
 * 2. Patient confirms → ConfirmConsultationUseCase
 * 3. Check-in → CheckInPatientUseCase
 * 4. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Patient must exist
 * - Doctor ID is required
 * - Appointment date and time must be provided
 * - Consultation request starts with APPROVED status (no review needed)
 * - Appointment status is PENDING (waiting for patient confirmation)
 * - Only frontdesk staff can create consultations (enforced at API level)
 */
export class CreateConsultationFromFrontdeskUseCase {
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
   * Executes the create consultation from frontdesk use case
   * 
   * @param dto - CreateConsultationFromFrontdeskDto with consultation data
   * @param userId - User ID performing the action (frontdesk staff ID)
   * @returns Promise resolving to AppointmentResponseDto with created appointment data
   * @throws DomainException if validation fails
   */
  async execute(dto: CreateConsultationFromFrontdeskDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new DomainException(`Patient with ID ${dto.patientId} not found`, {
        patientId: dto.patientId,
      });
    }

    // Step 2: Validate required fields
    if (!dto.concernDescription || dto.concernDescription.trim().length === 0) {
      throw new DomainException('Concern description is required for consultation requests', {
        patientId: dto.patientId,
      });
    }

    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required for frontdesk-created consultations', {
        patientId: dto.patientId,
      });
    }

    if (!dto.appointmentDate) {
      throw new DomainException('Appointment date is required for frontdesk-created consultations', {
        patientId: dto.patientId,
      });
    }

    if (!dto.appointmentTime || dto.appointmentTime.trim().length === 0) {
      throw new DomainException('Appointment time is required for frontdesk-created consultations', {
        patientId: dto.patientId,
      });
    }

    // Step 3: Build note from concern description and additional notes
    const note = [
      dto.concernDescription,
      dto.notes ? `Additional notes: ${dto.notes}` : '',
      `Created by: Frontdesk staff on ${this.timeService.now().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Step 4: Create appointment domain entity
    // Use PENDING status for appointment (waiting for patient confirmation)
    // Consultation request status will be set to APPROVED at infrastructure level
    const appointment = ApplicationAppointmentMapper.fromScheduleDto(
      {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentDate: dto.appointmentDate,
        time: dto.appointmentTime,
        type: 'Consultation Request',
        note,
      },
      AppointmentStatus.PENDING,
      0, // Temporary ID, will be replaced after save
    );

    // Step 5: Validate state transition (null → APPROVED is valid)
    if (!isValidConsultationRequestTransition(null, ConsultationRequestStatus.APPROVED)) {
      throw new DomainException('Invalid consultation request status transition', {
        from: null,
        to: ConsultationRequestStatus.APPROVED,
      });
    }

    // Step 6: Save appointment to repository with consultation_request_status = APPROVED
    // Note: We cast to access extended save method with consultation request fields
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: ConsultationRequestStatus.APPROVED,
    };

    await (this.appointmentRepository as any).save(appointment, consultationRequestFields);

    // Step 7: Retrieve saved appointment to get the assigned ID
    const allPatientAppointments = await this.appointmentRepository.findByPatient(dto.patientId);
    const savedAppointment = allPatientAppointments
      .filter((apt) => apt.getNote() === note)
      .sort((a, b) => (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0))[0];

    if (!savedAppointment) {
      throw new Error('Failed to retrieve saved consultation request');
    }

    // Step 8: Send notification to Patient
    try {
      await this.notificationService.sendEmail(
        patient.getEmail(),
        'Consultation Appointment Scheduled',
        `Your consultation appointment has been scheduled for ${dto.appointmentDate.toLocaleDateString()} at ${dto.appointmentTime}. Please confirm your attendance.`,
      );
    } catch (error) {
      // Notification failure should not break the use case
      console.error('Failed to send patient consultation notification:', error);
    }

    // Step 9: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: savedAppointment.getId().toString(),
      action: 'CREATE',
      model: 'ConsultationRequest',
      details: `Frontdesk staff created consultation request for patient ${patient.getFullName()} - ${dto.concernDescription}`,
    });

    // Step 10: Map domain entity to response DTO with consultation request fields
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, consultationRequestFields);
    
    return responseDto;
  }
}
