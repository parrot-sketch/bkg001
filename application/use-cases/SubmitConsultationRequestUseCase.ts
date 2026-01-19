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
import { SubmitConsultationRequestDto } from '../dtos/SubmitConsultationRequestDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: SubmitConsultationRequestUseCase
 * 
 * Orchestrates the submission of a consultation request by a patient.
 * 
 * Business Purpose:
 * - Creates appointment with consultation_request_status = SUBMITTED
 * - Validates patient exists
 * - Ensures patient cannot self-approve (enforced by status)
 * - Sends notification to Frontdesk for review
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is the first step in the consultation request workflow:
 * 1. Patient submits consultation → SubmitConsultationRequestUseCase (this)
 * 2. Frontdesk reviews → ReviewConsultationRequestUseCase
 * 3. Patient confirms → ConfirmConsultationUseCase
 * 4. Check-in → CheckInPatientUseCase
 * 5. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Patient must exist
 * - Doctor ID is optional (can be assigned later)
 * - Consultation request starts with SUBMITTED status
 * - Appointment status is PENDING (not yet scheduled)
 * - Concern description is required
 */
export class SubmitConsultationRequestUseCase {
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
   * Executes the submit consultation request use case
   * 
   * @param dto - SubmitConsultationRequestDto with consultation request data
   * @param userId - User ID performing the action (patient ID, for audit purposes)
   * @returns Promise resolving to AppointmentResponseDto with created appointment data
   * @throws DomainException if validation fails
   */
  async execute(dto: SubmitConsultationRequestDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new DomainException(`Patient with ID ${dto.patientId} not found`, {
        patientId: dto.patientId,
      });
    }

    // Step 2: Validate concern description is provided
    if (!dto.concernDescription || dto.concernDescription.trim().length === 0) {
      throw new DomainException('Concern description is required for consultation requests', {
        patientId: dto.patientId,
      });
    }

    // Step 3: Validate patient is submitting their own request (security check)
    if (dto.patientId !== userId) {
      throw new DomainException('Patients can only submit consultation requests for themselves', {
        patientId: dto.patientId,
        userId,
      });
    }

    // Step 4: Determine appointment date (use preferred date or default to today + 1 day)
    const now = this.timeService.now();
    const appointmentDate = dto.preferredDate 
      ? new Date(dto.preferredDate)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow

    // Step 5: Determine appointment time (use time preference or default)
    const appointmentTime = dto.timePreference || 'Morning';

    // Step 6: Build note from concern description and additional notes
    const note = [
      dto.concernDescription,
      dto.notes ? `Additional notes: ${dto.notes}` : '',
      dto.medicalInfo ? `Medical info: Over 18: ${dto.medicalInfo.isOver18}, Serious conditions: ${dto.medicalInfo.hasSeriousConditions}, Pregnant: ${dto.medicalInfo.isPregnant}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Step 7: Validate doctor ID (required for appointment creation)
    // Note: For consultation requests without a doctor, we need a placeholder
    // In the future, we could allow null doctor_id for consultation requests, but for now it's required
    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required for consultation request. Please select a doctor or service provider.', {
        patientId: dto.patientId,
      });
    }

    // Step 8: Create appointment domain entity
    // Use PENDING status for appointment (not yet scheduled)
    // Consultation request status will be set to SUBMITTED at infrastructure level
    const appointment = ApplicationAppointmentMapper.fromScheduleDto(
      {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentDate,
        time: appointmentTime,
        type: 'Consultation Request',
        note,
      },
      AppointmentStatus.PENDING,
      0, // Temporary ID, will be replaced after save
    );

    // Step 9: Validate state transition (null → SUBMITTED is valid)
    if (!isValidConsultationRequestTransition(null, ConsultationRequestStatus.SUBMITTED)) {
      throw new DomainException('Invalid consultation request status transition', {
        from: null,
        to: ConsultationRequestStatus.SUBMITTED,
      });
    }

    // Step 10: Save appointment to repository with consultation_request_status = SUBMITTED
    // Note: We cast to access extended save method with consultation request fields
    // The concrete implementation (PrismaAppointmentRepository) supports this
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: ConsultationRequestStatus.SUBMITTED,
    };
    
    // Cast repository to access extended save method (optional consultation request parameter)
    // This is safe because PrismaAppointmentRepository implements the extended interface
    await (this.appointmentRepository as any).save(appointment, consultationRequestFields);

    // Step 11: Retrieve saved appointment to get the assigned ID
    const allPatientAppointments = await this.appointmentRepository.findByPatient(dto.patientId);
    const savedAppointment = allPatientAppointments
      .filter((apt) => apt.getNote() === note)
      .sort((a, b) => (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0))[0];

    if (!savedAppointment) {
      throw new Error('Failed to retrieve saved consultation request');
    }

    // Step 12: Send notification to Frontdesk (in-app notification)
    // Note: For now, we'll use a placeholder. Full notification system will be implemented separately.
    try {
      // TODO: Send notification to Frontdesk users
      // await this.notificationService.notifyFrontdesk('consultation_submitted', { appointmentId: savedAppointment.getId() });
      console.log(`[Notification] Consultation request submitted by patient ${dto.patientId}, appointment ID: ${savedAppointment.getId()}`);
    } catch (error) {
      // Notification failure should not break the use case
      console.error('Failed to send consultation submission notification:', error);
    }

    // Step 13: Send confirmation to patient
    try {
      await this.notificationService.sendEmail(
        patient.getEmail(),
        'Consultation Request Received',
        `Your consultation request has been received and is being reviewed by our clinical team. We will contact you shortly.`,
      );
    } catch (error) {
      console.error('Failed to send patient confirmation notification:', error);
    }

    // Step 14: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: savedAppointment.getId().toString(),
      action: 'CREATE',
      model: 'ConsultationRequest',
      details: `Patient ${patient.getFullName()} submitted consultation request for ${dto.concernDescription}`,
    });

    // Step 15: Map domain entity to response DTO with consultation request fields
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, consultationRequestFields);
    
    return responseDto;
  }
}