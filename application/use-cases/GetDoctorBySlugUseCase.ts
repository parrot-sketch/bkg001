import { IDoctorRepository } from '../../domain/interfaces/repositories/IDoctorRepository';
import { DoctorResponseDto } from '../dtos/DoctorResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: GetDoctorBySlugUseCase
 * 
 * Fetches a doctor's public profile by their URL slug.
 * Used for public-facing doctor profile pages.
 */
export class GetDoctorBySlugUseCase {
    constructor(private readonly doctorRepository: IDoctorRepository) {
        if (!doctorRepository) {
            throw new Error('DoctorRepository is required');
        }
    }

    async execute(slug: string): Promise<DoctorResponseDto> {
        // Validate slug
        if (!slug || slug.trim() === '') {
            throw new DomainException('Slug is required', { slug });
        }

        // Fetch doctor by slug
        const doctor = await this.doctorRepository.findBySlug(slug);

        if (!doctor) {
            throw new DomainException(`Doctor with slug "${slug}" not found`, { slug });
        }

        // Map to DTO
        return this.mapToDto(doctor);
    }

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
            slug: doctor.slug ?? undefined,
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
            yearsOfExperience: doctor.years_of_experience ?? undefined,
            consultationFee: doctor.consultation_fee ?? undefined,
            languages: doctor.languages ?? undefined,
            colorCode: doctor.colorCode ?? undefined,
            onboardingStatus: doctor.onboarding_status ?? undefined,
            createdAt: doctor.created_at,
            updatedAt: doctor.updated_at,
        };
    }
}
