import { Patient } from '../../domain/entities/Patient';
import { CreatePatientDto } from '../dtos/CreatePatientDto';
import { PatientResponseDto } from '../dtos/PatientResponseDto';
import { Gender } from '../../domain/enums/Gender';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';

export class PatientMapper {
  static fromCreateDto(dto: CreatePatientDto, fileNumber: string): Patient {
    if (!Object.values(Gender).includes(dto.gender as Gender)) {
      throw new DomainException(`Invalid gender: ${dto.gender}`);
    }

    const dateOfBirth = dto.dateOfBirth instanceof Date
      ? dto.dateOfBirth
      : new Date(dto.dateOfBirth);

    if (isNaN(dateOfBirth.getTime())) {
      throw new DomainException(`Invalid date of birth: ${dto.dateOfBirth}`);
    }

    if (!dto.id) {
      throw new DomainException('Patient ID is required');
    }

    const email = Email.create(dto.email);
    const phone = PhoneNumber.create(dto.phone);

    return Patient.create({
      id: dto.id,
      fileNumber: fileNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dateOfBirth,
      gender: dto.gender as Gender,
      email: email,
      phone: phone,
      whatsappPhone: dto.whatsappPhone || undefined,
      address: dto.address || undefined,
      occupation: dto.occupation || undefined,
      maritalStatus: dto.maritalStatus || undefined,
      emergencyContactName: dto.emergencyContactName || undefined,
      emergencyContactNumber: dto.emergencyContactNumber
        ? PhoneNumber.create(dto.emergencyContactNumber)
        : undefined,
      relation: dto.relation || undefined,
      privacyConsent: dto.privacyConsent ?? true,
      serviceConsent: dto.serviceConsent ?? true,
      medicalConsent: dto.medicalConsent ?? true,
      bloodGroup: dto.bloodGroup || undefined,
      allergies: dto.allergies || undefined,
      medicalConditions: dto.medicalConditions || undefined,
      medicalHistory: dto.medicalHistory || undefined,
      insuranceProvider: dto.insuranceProvider || undefined,
      insuranceNumber: dto.insuranceNumber || undefined,
    });
  }

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
      maritalStatus: patient.getMaritalStatus() ?? '',
      emergencyContactName: patient.getEmergencyContactName() ?? '',
      emergencyContactNumber: patient.getEmergencyContactNumber()?.getValue() ?? '',
      relation: patient.getRelation() ?? '',
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
      profileImage: patient.getImg(),
      colorCode: patient.getColorCode(),
    };
  }
}
