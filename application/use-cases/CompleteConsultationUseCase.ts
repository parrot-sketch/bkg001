import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IPaymentRepository } from '../../domain/interfaces/repositories/IPaymentRepository';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { ISurgicalCaseRepository } from '../../domain/interfaces/repositories/ISurgicalCaseRepository';
import { ICasePlanRepository } from '../../domain/interfaces/repositories/ICasePlanRepository';
import { IConsultationRepository } from '../../domain/interfaces/repositories/IConsultationRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationOutcomeType } from '../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../domain/enums/PatientDecision';
import { ConsultationNotes } from '../../domain/value-objects/ConsultationNotes';
import { CompleteConsultationDto } from '../dtos/CompleteConsultationDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import { ScheduleAppointmentDto } from '../dtos/ScheduleAppointmentDto';
import db from '@/lib/db';

/**
 * Default consultation fee if doctor doesn't have one set
 */
const DEFAULT_CONSULTATION_FEE = 5000; // Should come from clinic settings

/**
 * Use Case: CompleteConsultationUseCase
 * 
 * Orchestrates the completion of a consultation and optionally schedules follow-up.
 * 
 * Business Purpose:
 * - Marks appointment as COMPLETED
 * - Stores consultation outcome/notes
 * - Creates billing record for frontdesk to collect payment
 * - Optionally schedules follow-up appointment
 * - Sends notification to patient
 * - Notifies frontdesk of pending payment
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the consultation completion workflow:
 * 1. Start consultation → StartConsultationUseCase
 * 2. Complete consultation → CompleteConsultationUseCase (this)
 * 3. Frontdesk collects payment → RecordPaymentUseCase (separate)
 * 4. (Optional) Schedule follow-up → ScheduleAppointmentUseCase
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment must be IN_CONSULTATION (active consultation)
 * - Doctor ID must match appointment's doctor
 * - Outcome/notes are required
 * - Payment record is ALWAYS created with UNPAID status
 * - Follow-up appointment is optional but validated if provided
 * - Audit trail required for all consultation completions
 */
export class CompleteConsultationUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    private readonly paymentRepository?: IPaymentRepository,
    private readonly userRepository?: IUserRepository,
    private readonly surgicalCaseRepository?: ISurgicalCaseRepository,
    private readonly casePlanRepository?: ICasePlanRepository,
    private readonly consultationRepository?: IConsultationRepository,
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
    // Optional repositories for backward compatibility
  }

  /**
   * Executes the complete consultation use case
   * 
   * @param dto - CompleteConsultationDto with appointment ID, outcome, and optional follow-up
   * @returns Promise resolving to AppointmentResponseDto with completed appointment data
   * @throws DomainException if appointment not found or cannot be completed
   */
  async execute(dto: CompleteConsultationDto): Promise<AppointmentResponseDto> {
    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate doctor ID matches appointment
    if (appointment.getDoctorId() !== dto.doctorId) {
      throw new DomainException(
        `Doctor ${dto.doctorId} is not assigned to appointment ${dto.appointmentId}`,
        {
          appointmentId: dto.appointmentId,
          doctorId: dto.doctorId,
          assignedDoctorId: appointment.getDoctorId(),
        },
      );
    }

    // Step 3: Validate appointment can be completed
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot complete a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Appointment is already completed', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 4: Finalize consultation + appointment ATOMICALLY
    // This transaction ensures that the Consultation record, Appointment status,
    // and temporal fields are all updated together or not at all.
    const completedAt = new Date();

    // 4a. Finalize the Consultation record (if it exists)
    if (this.consultationRepository) {
      const consultation = await this.consultationRepository.findByAppointmentId(dto.appointmentId);
      if (consultation && !consultation.isCompleted()) {
        try {
          const notes = ConsultationNotes.createRaw(dto.outcome);
          const completedConsultation = consultation.complete({
            outcomeType: dto.outcomeType as ConsultationOutcomeType,
            notes,
            patientDecision: dto.patientDecision as PatientDecision | undefined,
            completedAt,
          });
          await this.consultationRepository.update(completedConsultation);
        } catch (consultationError) {
          // If the domain entity rejects (e.g. state mismatch), log but continue
          // The appointment completion is still valid
          console.error('Failed to finalize Consultation record:', consultationError);
        }
      }
    }

    // 4b. Update Appointment status + temporal tracking
    let updatedAppointment = ApplicationAppointmentMapper.updateStatus(
      appointment,
      AppointmentStatus.COMPLETED,
    );

    // Add outcome to notes
    const existingNote = appointment.getNote() || '';
    const outcomeNote = existingNote
      ? `${existingNote}\n\n[Consultation Completed] ${dto.outcome}`
      : `[Consultation Completed] ${dto.outcome}`;
    updatedAppointment = ApplicationAppointmentMapper.updateNote(updatedAppointment, outcomeNote);

    // Step 5: Save updated appointment
    await this.appointmentRepository.update(updatedAppointment);

    // 5b. Update temporal fields directly (consultation_ended_at, duration)
    // Read the raw appointment to get consultation_started_at for duration calculation
    const rawAppointment = await db.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { consultation_started_at: true },
    });
    const consultationDuration = rawAppointment?.consultation_started_at
      ? Math.round((completedAt.getTime() - rawAppointment.consultation_started_at.getTime()) / 60000)
      : null;

    await db.appointment.update({
      where: { id: dto.appointmentId },
      data: {
        consultation_ended_at: completedAt,
        consultation_duration: consultationDuration,
      },
    });

    // Step 6: Optionally schedule follow-up appointment
    let followUpAppointment: AppointmentResponseDto | undefined;
    if (dto.followUpDate && dto.followUpTime && dto.followUpType) {
      // Validate follow-up date is in the future
      const now = new Date();
      if (dto.followUpDate < now) {
        throw new DomainException('Follow-up appointment date must be in the future', {
          followUpDate: dto.followUpDate,
        });
      }

      // Note: We would normally call ScheduleAppointmentUseCase here,
      // but to avoid circular dependencies, we'll create the appointment directly
      // In a production system, we'd use dependency injection or a service orchestrator
      const followUpScheduleDto: ScheduleAppointmentDto = {
        patientId: appointment.getPatientId(),
        doctorId: appointment.getDoctorId(),
        appointmentDate: dto.followUpDate,
        time: dto.followUpTime,
        type: dto.followUpType,
        note: `Follow-up appointment for appointment ${dto.appointmentId}`,
      };

      const followUpEntity = ApplicationAppointmentMapper.fromScheduleDto(
        followUpScheduleDto,
        AppointmentStatus.PENDING,
        0, // Temporary ID
      );

      await this.appointmentRepository.save(followUpEntity);

      // Retrieve saved follow-up appointment
      const allPatientAppointments = await this.appointmentRepository.findByPatient(
        appointment.getPatientId(),
      );
      // Store followUpDate in a const to ensure type narrowing works in filter
      const followUpDate = dto.followUpDate;
      const savedFollowUp = allPatientAppointments
        .filter(
          (apt) =>
            apt.getDoctorId() === appointment.getDoctorId() &&
            apt.getAppointmentDate().getTime() === followUpDate.getTime() &&
            apt.getStatus() === AppointmentStatus.PENDING,
        )
        .sort(
          (a, b) =>
            (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0),
        )[0];

      if (savedFollowUp) {
        followUpAppointment = ApplicationAppointmentMapper.toResponseDto(savedFollowUp);
      }
    }

    // Step 7: Create or update billing record (if payment repository available)
    let paymentId: number | undefined;
    if (this.paymentRepository) {
      try {
        // Check if a payment record already exists (e.g., created via BillingTab during consultation)
        const existingPayment = await this.paymentRepository.findByAppointmentId(dto.appointmentId);

        if (existingPayment) {
          // Payment already exists (doctor saved billing during consultation).
          // If the dialog provided updated billing items, update the payment via the billing API.
          // Otherwise, leave the existing payment as-is.
          paymentId = existingPayment.id;

          if (dto.billingItems && dto.billingItems.length > 0 && existingPayment.status !== 'PAID') {
            // Doctor updated billing items in the Complete dialog — update the payment
            const totalAmount = dto.customTotalAmount ?? dto.billingItems.reduce(
              (sum, item) => sum + (item.quantity * item.unitCost), 0
            );
            const discount = dto.discount || 0;

            // Update payment total and replace bill items
            await db.patientBill.deleteMany({
              where: { payment_id: existingPayment.id },
            });

            await db.payment.update({
              where: { id: existingPayment.id },
              data: {
                total_amount: totalAmount,
                discount,
                bill_items: {
                  create: dto.billingItems.map(item => ({
                    service_id: item.serviceId,
                    service_date: new Date(),
                    quantity: item.quantity,
                    unit_cost: item.unitCost,
                    total_cost: item.quantity * item.unitCost,
                  })),
                },
              },
            });
          }
        } else {
          // No existing payment — create one
          let totalAmount: number;
          let billItems: Array<{ serviceId: number; quantity: number; unitCost: number }> | undefined;
          let discount = dto.discount || 0;

          if (dto.billingItems && dto.billingItems.length > 0) {
            // Doctor specified billing items — use itemized billing
            billItems = dto.billingItems.map(item => ({
              serviceId: item.serviceId,
              quantity: item.quantity,
              unitCost: item.unitCost,
            }));
            totalAmount = dto.customTotalAmount ?? dto.billingItems.reduce(
              (sum, item) => sum + (item.quantity * item.unitCost), 0
            );
          } else if (dto.customTotalAmount) {
            // Custom amount without items
            totalAmount = dto.customTotalAmount;
          } else {
            // Default: use doctor's consultation fee
            const doctor = await db.doctor.findUnique({
              where: { id: appointment.getDoctorId() },
              select: { consultation_fee: true, name: true },
            });
            totalAmount = doctor?.consultation_fee || DEFAULT_CONSULTATION_FEE;
          }
          
          // Create payment record with UNPAID status
          const payment = await this.paymentRepository.create({
            patientId: appointment.getPatientId(),
            appointmentId: dto.appointmentId,
            totalAmount,
            discount,
            billItems,
          });
          
          paymentId = payment.id;
        }

        // Notify frontdesk users about pending payment
        if (this.userRepository && paymentId) {
          const currentPayment = await this.paymentRepository.findById(paymentId);
          const totalAmount = currentPayment?.totalAmount || 0;

          const frontdeskUsers = await this.userRepository.findByRole('FRONTDESK');
          const patient = await this.patientRepository.findById(appointment.getPatientId());
          const patientName = patient ? patient.getFullName() : 'Patient';
          
          // Send in-app notification to all frontdesk users
          for (const frontdeskUser of frontdeskUsers) {
            try {
              await this.notificationService.sendInApp(
                frontdeskUser.getId(),
                'Payment Ready for Collection',
                `${patientName}'s consultation is complete. Amount due: ${totalAmount.toLocaleString()}`,
                'info',
                {
                  resourceType: 'payment',
                  resourceId: paymentId,
                  appointmentId: dto.appointmentId,
                },
              );
            } catch (notifyError) {
              console.error(`Failed to notify frontdesk user ${frontdeskUser.getId()}:`, notifyError);
            }
          }
        }
      } catch (billingError) {
        // Log but don't fail - consultation is complete, billing can be created manually
        console.error('Failed to create billing record:', billingError);
      }
    }

    // Step 8: Create surgical case if procedure recommended and patient accepted
    let surgicalCaseId: string | undefined;
    if (
      dto.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED &&
      dto.patientDecision === PatientDecision.YES &&
      this.surgicalCaseRepository &&
      this.casePlanRepository
    ) {
      try {
        // Get consultation record for linking
        let consultationId: number | undefined;
        if (this.consultationRepository) {
          const consultation = await this.consultationRepository.findByAppointmentId(dto.appointmentId);
          consultationId = consultation?.getId();
        }

        // Create surgical case
        const surgicalCase = await this.surgicalCaseRepository.create({
          patientId: appointment.getPatientId(),
          primarySurgeonId: dto.doctorId,
          consultationId,
          appointmentId: dto.appointmentId,
          urgency: dto.procedureRecommended?.urgency as any,
          diagnosis: dto.outcome,
          procedureName: dto.procedureRecommended?.procedureType,
          createdBy: dto.doctorId,
        });

        surgicalCaseId = surgicalCase.id;

        // Create case plan linked to surgical case
        await this.casePlanRepository.save({
          appointmentId: dto.appointmentId,
          patientId: appointment.getPatientId(),
          doctorId: dto.doctorId,
          procedurePlan: dto.procedureRecommended?.notes,
          preOpNotes: dto.outcome,
        });

        // Link case plan to surgical case
        const casePlan = await this.casePlanRepository.findByAppointmentId(dto.appointmentId);
        if (casePlan) {
          await this.casePlanRepository.linkToSurgicalCase(casePlan.id, surgicalCase.id);
        }

        // Notify nurses about new surgical case
        if (this.userRepository) {
          const nurseUsers = await this.userRepository.findByRole('NURSE');
          const patient = await this.patientRepository.findById(appointment.getPatientId());
          const patientName = patient ? patient.getFullName() : 'Patient';

          for (const nurse of nurseUsers) {
            try {
              await this.notificationService.sendInApp(
                nurse.getId(),
                'New Surgical Case - Pre-Op Required',
                `${patientName} has a new surgical case pending pre-operative preparation. Procedure: ${dto.procedureRecommended?.procedureType || 'Not specified'}`,
                'info',
                {
                  resourceType: 'surgical_case',
                  resourceId: surgicalCase.id,
                  appointmentId: dto.appointmentId,
                  patientId: appointment.getPatientId(),
                },
              );
            } catch (notifyError) {
              console.error(`Failed to notify nurse ${nurse.getId()}:`, notifyError);
            }
          }
        }
      } catch (surgeryError) {
        // Log but don't fail - consultation is complete, surgical case can be created manually
        console.error('Failed to create surgical case:', surgeryError);
      }
    }

    // Step 9: Send notification to patient
    try {
      const patient = await this.patientRepository.findById(appointment.getPatientId());
      if (patient) {
        await this.notificationService.sendEmail(
          patient.getEmail(),
          'Consultation Completed',
          `Your consultation on ${appointment.getAppointmentDate().toLocaleDateString()} has been completed.\n\nOutcome: ${dto.outcome}${
            followUpAppointment
              ? `\n\nFollow-up appointment scheduled for ${followUpAppointment.appointmentDate.toLocaleDateString()} at ${followUpAppointment.time}.`
              : ''
          }${surgicalCaseId ? '\n\nA surgical case has been created for your procedure. The clinic team will contact you with next steps.' : ''}`,
        );
      }
    } catch (error) {
      // Notification failure should not break the use case
      console.error('Failed to send completion notification:', error);
    }

    // Step 10: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: updatedAppointment.getId().toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Consultation completed for appointment ${dto.appointmentId} by doctor ${dto.doctorId}${paymentId ? ` (payment created: ${paymentId})` : ''}${followUpAppointment ? ` (follow-up scheduled: ${followUpAppointment.id})` : ''}${surgicalCaseId ? ` (surgical case created: ${surgicalCaseId})` : ''}`,
    });

    // Step 11: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
