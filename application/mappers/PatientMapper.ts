import { Patient } from '../../domain/entities/Patient';
import { CreatePatientDto } from '../dtos/CreatePatientDto';
import { PatientResponseDto } from '../dtos/PatientResponseDto';
import { Gender } from '../../domain/enums/Gender';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';

/**
 * Mapper: PatientMapper
 * 
 * Maps between Patient DTOs and Patient domain entities.
 * This mapper handles translation between the application layer (DTOs)
 * and the domain layer (entities).
 * 
 * Responsibilities:
 * - Convert DTOs to domain entities
 * - Convert domain entities to DTOs
 * - Handle validation and type conversion
 * - NO business logic - only data transformation
 */
export class PatientMapper {
  /**
   * Maps a CreatePatientDto to a Patient domain entity
   * 
   * @param dto - CreatePatientDto with patient creation data
   * @param fileNumber - System-generated file number (e.g., "NS001")
   * @returns Patient domain entity
   * @throws DomainException if validation fails
   */
  static fromCreateDto(dto: CreatePatientDto, fileNumber: string): Patient {
    // Validate gender
    if (!Object.values(Gender).includes(dto.gender as Gender)) {
      throw new DomainException(`Invalid gender: ${dto.gender}`, {
        providedValue: dto.gender,
        validValues: Object.values(Gender),
      });
    }

    // Convert dateOfBirth to Date if it's a string (happens when deserializing JSON)
    // JSON.parse() returns date strings, not Date objects
    const dateOfBirth = dto.dateOfBirth instanceof Date 
      ? dto.dateOfBirth 
      : new Date(dto.dateOfBirth);

    // Validate the date conversion succeeded
    if (isNaN(dateOfBirth.getTime())) {
      throw new DomainException(`Invalid date of birth: ${dto.dateOfBirth}`, {
        providedValue: dto.dateOfBirth,
      });
    }

    // Create value objects for email and phone numbers
    const email = Email.create(dto.email);
    const phone = PhoneNumber.create(dto.phone);
    const emergencyContactNumber = PhoneNumber.create(dto.emergencyContactNumber);

    // Use Patient.create factory method which handles all validation
    return Patient.create({
      id: dto.id,
      fileNumber: fileNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dateOfBirth,
      gender: dto.gender as Gender,
      email: email,
      phone: phone,
      whatsappPhone: dto.whatsappPhone,
      address: dto.address,
      occupation: dto.occupation,
      maritalStatus: dto.maritalStatus,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactNumber: emergencyContactNumber,
      relation: dto.relation,
      privacyConsent: dto.privacyConsent,
      serviceConsent: dto.serviceConsent,
      medicalConsent: dto.medicalConsent,
      bloodGroup: dto.bloodGroup,
      allergies: dto.allergies,
      medicalConditions: dto.medicalConditions,
      medicalHistory: dto.medicalHistory,
      insuranceProvider: dto.insuranceProvider,
      insuranceNumber: dto.insuranceNumber,
    });
  }

  /**
   * Maps a Patient domain entity to a PatientResponseDto
   * 
   * @param patient - Patient domain entity
   * @returns PatientResponseDto with patient data
   */
  static toResponseDto(patient: Patient): PatientResponseDto {
    return {
      id: patient.getId(),
      fileNumber: patient.getFileNumber(),
      firstName: patient.getFirstName(),
      lastName: patient.getLastName(),
      fullName: patient.getFullName(),
      dateOfBirth: patient.getDateOfBirth(),
      age: patient.getAge(),
      gender: patient.getGender(),
      email: patient.getEmail().getValue(),
      phone: patient.getPhone().getValue(),
      whatsappPhone: patient.getWhatsappPhone(),
      address: patient.getAddress(),
      occupation: patient.getOccupation(),
      maritalStatus: patient.getMaritalStatus(),
      emergencyContactName: patient.getEmergencyContactName(),
      emergencyContactNumber: patient.getEmergencyContactNumber().getValue(),
      relation: patient.getRelation(),
      hasPrivacyConsent: patient.hasPrivacyConsent(),
      hasServiceConsent: patient.hasServiceConsent(),
      hasMedicalConsent: patient.hasMedicalConsent(),
      bloodGroup: patient.getBloodGroup(),
      allergies: patient.getAllergies(),
      medicalConditions: patient.getMedicalConditions(),
      medicalHistory: patient.getMedicalHistory(),
      insuranceProvider: patient.getInsuranceProvider(),
      insuranceNumber: patient.getInsuranceNumber(),
      createdAt: patient.getCreatedAt(),
      updatedAt: patient.getUpdatedAt(),
    };
  }
}
