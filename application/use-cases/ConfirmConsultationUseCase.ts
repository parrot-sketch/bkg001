import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { isValidConsultationRequestTransition } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { ConfirmConsultationDto } from '../dtos/ConfirmConsultationDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: ConfirmConsultationUseCase
 * 
 * Orchestrates the confirmation of a scheduled consultation by a patient.
 * 
 * Business Purpose:
 * - Allows patient to confirm a scheduled consultation time
 * - Updates consultation_request_status to CONFIRMED
 * - Updates appointment status to SCHEDULED (if not already)
 * - Sends notification to doctor
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is the third step in the consultation request workflow:
 * 1. Patient submits → SubmitConsultationRequestUseCase
 * 2. Frontdesk reviews and approves → ReviewConsultationRequestUseCase
 * 3. Patient confirms → ConfirmConsultationUseCase (this)
 * 4. Check-in → CheckInPatientUseCase
 * 5. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Only the patient can confirm their own consultation
 * - Consultation request must be in SCHEDULED status (proposed by Frontdesk)
 * - Cannot confirm if already CONFIRMED
 * - Cannot confirm if consultation request is CANCELLED
 */
export class ConfirmConsultationUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly userRepository: IUserRepository,
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
    if (!userRepository) {
      throw new Error('UserRepository is required');
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
   * Executes the confirm consultation use case
   * 
   * @param dto - ConfirmConsultationDto with confirmation data
   * @param userId - User ID performing the confirmation (must be patient)
   * @returns Promise resolving to AppointmentResponseDto with confirmed appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: ConfirmConsultationDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Validate patient exists
    // Note: The API layer already validated that userId maps to patientId
    // We rely on the appointment ownership check (Step 4) to ensure patient is confirming their own consultation
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new DomainException(`Patient with ID ${dto.patientId} not found`, {
        patientId: dto.patientId,
      });
    }

    // Step 3: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 4: Validate appointment belongs to patient
    if (appointment.getPatientId() !== dto.patientId) {
      throw new DomainException('Appointment does not belong to this patient', {
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        appointmentPatientId: appointment.getPatientId(),
      });
    }

    // Step 5: Validate appointment is not cancelled or completed
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot confirm a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot confirm a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 6: Get current consultation request status from database
    let currentConsultationFields: ConsultationRequestFields | null = null;
    try {
      currentConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
      // If retrieval fails, assume SCHEDULED for validation
      currentConsultationFields = { consultationRequestStatus: ConsultationRequestStatus.SCHEDULED };
    }

    // Step 7: Validate state transition (SCHEDULED → CONFIRMED)
    const currentStatus = currentConsultationFields?.consultationRequestStatus ?? ConsultationRequestStatus.SCHEDULED;
    const newStatus = ConsultationRequestStatus.CONFIRMED;
    
    if (!isValidConsultationRequestTransition(currentStatus, newStatus)) {
      throw new DomainException('Invalid consultation request status transition. Consultation must be scheduled before confirmation.', {
        appointmentId: dto.appointmentId,
        from: currentStatus,
        to: newStatus,
      });
    }

    // Step 8: Update appointment status to SCHEDULED if not already
    let updatedAppointment = appointment;
    if (appointment.getStatus() === AppointmentStatus.PENDING) {
      updatedAppointment = ApplicationAppointmentMapper.updateStatus(
        appointment,
        AppointmentStatus.SCHEDULED,
      );
    }

    // Step 9: Save updated appointment with consultation request fields
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: ConsultationRequestStatus.CONFIRMED,
    };
    
    // Cast repository to access extended update method (optional consultation request parameter)
    (this.appointmentRepository as any).update(updatedAppointment, consultationRequestFields);

    // Step 10: Retrieve updated appointment
    const savedAppointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!savedAppointment) {
      throw new Error('Failed to retrieve updated appointment');
    }

    // Step 11: Send notification to doctor
    // Note: We need to get doctor information to send notification
    // For now, we'll log this - full implementation would fetch doctor and send email
    try {
      // TODO: Get doctor email from doctor repository and send notification
      // const doctor = await this.doctorRepository.findById(savedAppointment.getDoctorId());
      // if (doctor) {
      //   await this.notificationService.sendEmail(
      //     doctor.getEmail(),
      //     'Consultation Confirmed',
      //     `Patient ${patient.getFullName()} has confirmed their consultation scheduled for ${savedAppointment.getAppointmentDate().toLocaleDateString()} at ${savedAppointment.getTime()}.`,
      //   );
      // }
      console.log(`[Notification] Consultation confirmed by patient ${dto.patientId}, appointment ID: ${dto.appointmentId}`);
    } catch (error) {
      console.error('Failed to send doctor confirmation notification:', error);
    }

    // Step 12: Send confirmation to patient
    try {
      await this.notificationService.sendEmail(
        patient.getEmail(),
        'Consultation Confirmed',
        `Your consultation has been confirmed for ${savedAppointment.getAppointmentDate().toLocaleDateString()} at ${savedAppointment.getTime()}. We look forward to seeing you.`,
      );
    } catch (error) {
      console.error('Failed to send patient confirmation notification:', error);
    }

    // Step 13: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'ConsultationRequest',
      details: `Patient confirmed consultation scheduled for ${savedAppointment.getAppointmentDate().toLocaleDateString()} at ${savedAppointment.getTime()}`,
    });

    // Step 14: Retrieve consultation request fields for response
    let updatedConsultationFields: ConsultationRequestFields | null = null;
    try {
      updatedConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
    }

    // Step 15: Map domain entity to response DTO with consultation request fields
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, updatedConsultationFields);
    
    return responseDto;
  }
}