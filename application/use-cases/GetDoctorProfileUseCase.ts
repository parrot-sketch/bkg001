import { IDoctorRepository } from '../../domain/interfaces/repositories/IDoctorRepository';
import { DoctorResponseDto } from '../dtos/DoctorResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: GetDoctorProfileUseCase
 * 
 * Retrieves a doctor's profile information by User ID or Doctor ID.
 * Uses the Repository Pattern to decouple data access.
 */
export class GetDoctorProfileUseCase {
    constructor(private readonly doctorRepository: IDoctorRepository) {
        if (!doctorRepository) {
            throw new Error('DoctorRepository is required');
        }
    }

    /**
     * Execute by User ID (standard for logged-in doctor fetching their own profile)
     */
    async executeByUserId(userId: string): Promise<DoctorResponseDto> {
        const doctor = await this.doctorRepository.findByUserId(userId);

        if (!doctor) {
            throw new DomainException(`Doctor profile not found for user ID ${userId}`, {
                userId,
            });
        }

        return this.mapToDto(doctor);
    }

    /**
     * Execute by Doctor ID (for admin or public directory)
     */
    async executeByDoctorId(doctorId: string): Promise<DoctorResponseDto> {
        const doctor = await this.doctorRepository.findById(doctorId);

        if (!doctor) {
            throw new DomainException(`Doctor profile not found (ID: ${doctorId})`);
        }

        return this.mapToDto(doctor);
    }

    // Helper: Map Entity to DTO
    // In a larger system, this would be a separate Mapper service
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
            createdAt: doctor.created_at,
            updatedAt: doctor.updated_at,
        };
    }
}
