import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdateDoctorProfileDto } from '../dtos/UpdateDoctorProfileDto';
import { DoctorResponseDto } from '../dtos/DoctorResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { IDoctorRepository } from '../../domain/interfaces/repositories/IDoctorRepository';

/**
 * Use Case: UpdateDoctorProfileUseCase
 * 
 * Orchestrates updating a doctor's profile information.
 * Refactored to use Repository Pattern.
 */
export class UpdateDoctorProfileUseCase {
  constructor(
    private readonly doctorRepository: IDoctorRepository,
    private readonly auditService: IAuditService,
  ) {
    if (!doctorRepository) {
      throw new Error('DoctorRepository is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the update doctor profile use case
   */
  async execute(dto: UpdateDoctorProfileDto): Promise<DoctorResponseDto> {
    // Step 1: Verify doctor exists
    const doctor = await this.doctorRepository.findById(dto.doctorId);

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Prepare update data (only include fields that are provided)
    const updateData: any = {};

    if (dto.bio !== undefined) updateData.bio = dto.bio || null;
    if (dto.education !== undefined) updateData.education = dto.education || null;
    if (dto.focusAreas !== undefined) updateData.focus_areas = dto.focusAreas || null;
    if (dto.professionalAffiliations !== undefined) updateData.professional_affiliations = dto.professionalAffiliations || null;
    if (dto.profileImage !== undefined) updateData.profile_image = dto.profileImage || null;
    if (dto.clinicLocation !== undefined) updateData.clinic_location = dto.clinicLocation || null;

    // Additional Fields (Logic can be extended here)
    // E.g. Check license uniqueness if license is being updated

    // Step 3: Update doctor profile via Repository
    const updatedDoctor = await this.doctorRepository.update(dto.doctorId, updateData);

    // Step 4: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.doctorId,
      action: 'UPDATE',
      model: 'Doctor',
      details: `Doctor profile updated. Fields: ${Object.keys(updateData).join(', ')}`,
    });

    // Step 5: Map to response DTO
    return this.mapToDto(updatedDoctor);
  }

  // Helper: Map Entity to DTO
  private mapToDto(doctor: any): DoctorResponseDto {
    return {
      id: doctor.id,
      userId: doctor.user_id,
      email: doctor.email,
      firstName: doctor.first_name,
      lastName: doctor.last_name,
      title: doctor.title ?? undefined,
      name: doctor.name,
      specialization: doctor.specialization,
      licenseNumber: doctor.license_number,
      phone: doctor.phone,
      address: doctor.address,
      clinicLocation: doctor.clinic_location ?? undefined,
      department: doctor.department ?? undefined,
      profileImage: doctor.profile_image ?? undefined,
      availabilityStatus: doctor.availability_status ?? undefined,
      bio: doctor.bio ?? undefined,
      education: doctor.education ?? undefined,
      focusAreas: doctor.focus_areas ?? undefined,
      professionalAffiliations: doctor.professional_affiliations ?? undefined,
      createdAt: doctor.created_at,
      updatedAt: doctor.updated_at,
    };
  }
}

