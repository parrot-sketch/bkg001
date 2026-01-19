import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdateDoctorProfileDto } from '../dtos/UpdateDoctorProfileDto';
import { DoctorResponseDto } from '../dtos/DoctorResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

/**
 * Use Case: UpdateDoctorProfileUseCase
 * 
 * Orchestrates updating a doctor's profile information.
 * 
 * Business Purpose:
 * - Allows doctors to update their profile (bio, education, focus areas, etc.)
 * - Validates doctor exists
 * - Updates profile fields
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the doctor profile management:
 * 1. Doctor views profile → GetDoctorProfileUseCase (to be created)
 * 2. Doctor updates profile → UpdateDoctorProfileUseCase (this)
 * 
 * Business Rules:
 * - Doctor must exist
 * - Only doctor can update their own profile (or admin)
 * - Profile fields are optional but validated
 */
export class UpdateDoctorProfileUseCase {
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
   * Executes the update doctor profile use case
   * 
   * @param dto - UpdateDoctorProfileDto with doctor ID and profile fields
   * @returns Promise resolving to DoctorResponseDto with updated doctor data
   * @throws DomainException if validation fails
   */
  async execute(dto: UpdateDoctorProfileDto): Promise<DoctorResponseDto> {
    // Step 1: Verify doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Prepare update data (only include fields that are provided)
    const updateData: any = {};

    if (dto.bio !== undefined) {
      updateData.bio = dto.bio || null;
    }
    if (dto.education !== undefined) {
      updateData.education = dto.education || null;
    }
    if (dto.focusAreas !== undefined) {
      updateData.focus_areas = dto.focusAreas || null;
    }
    if (dto.professionalAffiliations !== undefined) {
      updateData.professional_affiliations = dto.professionalAffiliations || null;
    }
    if (dto.profileImage !== undefined) {
      updateData.profile_image = dto.profileImage || null;
    }
    if (dto.clinicLocation !== undefined) {
      updateData.clinic_location = dto.clinicLocation || null;
    }

    // Step 3: Update doctor profile
    const updatedDoctor = await this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: updateData,
    });

    // Step 4: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.doctorId,
      action: 'UPDATE',
      model: 'Doctor',
      details: `Doctor profile updated. Fields: ${Object.keys(updateData).join(', ')}`,
    });

    // Step 5: Map to response DTO
    // Note: This is a simplified mapping. In production, use a proper mapper
    const responseDto: DoctorResponseDto = {
      id: updatedDoctor.id,
      userId: updatedDoctor.user_id,
      email: updatedDoctor.email,
      firstName: updatedDoctor.first_name,
      lastName: updatedDoctor.last_name,
      title: updatedDoctor.title ?? undefined,
      name: updatedDoctor.name,
      specialization: updatedDoctor.specialization,
      licenseNumber: updatedDoctor.license_number,
      phone: updatedDoctor.phone,
      address: updatedDoctor.address,
      clinicLocation: updatedDoctor.clinic_location ?? undefined,
      department: updatedDoctor.department ?? undefined,
      profileImage: updatedDoctor.profile_image ?? undefined,
      availabilityStatus: updatedDoctor.availability_status ?? undefined,
      bio: updatedDoctor.bio ?? undefined,
      education: updatedDoctor.education ?? undefined,
      focusAreas: updatedDoctor.focus_areas ?? undefined,
      professionalAffiliations: updatedDoctor.professional_affiliations ?? undefined,
      createdAt: updatedDoctor.created_at,
      updatedAt: updatedDoctor.updated_at,
    };

    return responseDto;
  }
}
