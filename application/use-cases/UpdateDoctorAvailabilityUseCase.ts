import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdateDoctorAvailabilityDto, WorkingDayDto } from '../dtos/UpdateDoctorAvailabilityDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

/**
 * Use Case: UpdateDoctorAvailabilityUseCase
 * 
 * Orchestrates updating a doctor's availability (working days/hours).
 * 
 * Business Purpose:
 * - Allows doctors to update their working days and hours
 * - Validates doctor exists
 * - Updates or creates working day records
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the doctor availability management:
 * 1. Doctor views availability → GetDoctorAvailabilityUseCase (to be created)
 * 2. Doctor updates availability → UpdateDoctorAvailabilityUseCase (this)
 * 
 * Business Rules:
 * - Doctor must exist
 * - Only doctor can update their own availability (or admin)
 * - Working days must have valid day names and time formats
 * - Time format must be HH:mm
 */
export class UpdateDoctorAvailabilityUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditService: IAuditService,
  ) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the update doctor availability use case
   * 
   * @param dto - UpdateDoctorAvailabilityDto with doctor ID and working days
   * @returns Promise resolving to array of working days
   * @throws DomainException if validation fails
   */
  async execute(dto: UpdateDoctorAvailabilityDto): Promise<WorkingDayDto[]> {
    // Step 1: Verify doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Validate working days
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

    for (const workingDay of dto.workingDays) {
      if (!validDays.includes(workingDay.day)) {
        throw new DomainException(`Invalid day: ${workingDay.day}. Must be one of: ${validDays.join(', ')}`, {
          day: workingDay.day,
        });
      }

      if (!timeRegex.test(workingDay.startTime)) {
        throw new DomainException(`Invalid start time format: ${workingDay.startTime}. Must be HH:mm`, {
          startTime: workingDay.startTime,
        });
      }

      if (!timeRegex.test(workingDay.endTime)) {
        throw new DomainException(`Invalid end time format: ${workingDay.endTime}. Must be HH:mm`, {
          endTime: workingDay.endTime,
        });
      }

      // Validate end time is after start time
      const [startHours, startMinutes] = workingDay.startTime.split(':').map(Number);
      const [endHours, endMinutes] = workingDay.endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        throw new DomainException(`End time must be after start time for ${workingDay.day}`, {
          day: workingDay.day,
          startTime: workingDay.startTime,
          endTime: workingDay.endTime,
        });
      }
    }

    // Step 3: Find or Create Active Template
    let template = await this.prisma.availabilityTemplate.findFirst({
      where: { doctor_id: dto.doctorId, is_active: true }
    });

    if (!template) {
      template = await this.prisma.availabilityTemplate.create({
        data: {
          doctor_id: dto.doctorId,
          name: 'Standard',
          is_active: true
        }
      });
    }

    // Step 4: Map input days to slots structure
    const daysMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    // Clear existing slots for this template
    await this.prisma.availabilitySlot.deleteMany({
      where: { template_id: template.id }
    });

    // Create new slots
    const slotsData = dto.workingDays.map(wd => ({
      template_id: template.id,
      day_of_week: daysMap[wd.day],
      start_time: wd.startTime,
      end_time: wd.endTime,
      slot_type: 'CLINIC'
    }));

    if (slotsData.length > 0) {
      await this.prisma.availabilitySlot.createMany({
        data: slotsData
      });
    }

    // Step 5: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.doctorId,
      action: 'UPDATE',
      model: 'DoctorAvailability',
      details: `Doctor availability updated via legacy API. Slots: ${slotsData.length}`,
    });

    // Step 6: Map back to legacy response DTO
    // We can just return the input since we successfully saved it (and validated it)
    return dto.workingDays;
  }
}
