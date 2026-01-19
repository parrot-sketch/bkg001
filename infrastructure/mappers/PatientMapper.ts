import { Patient } from '../../domain/entities/Patient';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';
import { Gender } from '../../domain/enums/Gender';
import { Prisma, Patient as PrismaPatient } from '@prisma/client';

/**
 * Mapper: PatientMapper
 * 
 * Maps between Prisma Patient model and domain Patient entity.
 * This mapper handles the translation between infrastructure (Prisma) and domain layers.
 * 
 * Responsibilities:
 * - Convert Prisma snake_case to domain camelCase
 * - Convert Prisma types to domain value objects
 * - Handle optional fields and null values
 * - No business logic - only data translation
 */
export class PatientMapper {
  /**
   * Maps a Prisma Patient model to a domain Patient entity
   * 
   * @param prismaPatient - Prisma Patient model from database
   * @returns Domain Patient entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaPatient: PrismaPatient): Patient {
    return Patient.create({
      id: prismaPatient.id,
      fileNumber: prismaPatient.file_number, // Required field
      firstName: prismaPatient.first_name,
      lastName: prismaPatient.last_name,
      dateOfBirth: prismaPatient.date_of_birth,
      gender: prismaPatient.gender as Gender,
      email: Email.create(prismaPatient.email),
      phone: PhoneNumber.create(prismaPatient.phone),
      whatsappPhone: prismaPatient.whatsapp_phone ?? undefined,
      address: prismaPatient.address,
      occupation: prismaPatient.occupation ?? undefined,
      maritalStatus: prismaPatient.marital_status,
      emergencyContactName: prismaPatient.emergency_contact_name,
      emergencyContactNumber: PhoneNumber.create(prismaPatient.emergency_contact_number),
      relation: prismaPatient.relation,
      privacyConsent: prismaPatient.privacy_consent,
      serviceConsent: prismaPatient.service_consent,
      medicalConsent: prismaPatient.medical_consent,
      bloodGroup: prismaPatient.blood_group ?? undefined,
      allergies: prismaPatient.allergies ?? undefined,
      medicalConditions: prismaPatient.medical_conditions ?? undefined,
      medicalHistory: prismaPatient.medical_history ?? undefined,
      insuranceProvider: prismaPatient.insurance_provider ?? undefined,
      insuranceNumber: prismaPatient.insurance_number ?? undefined,
      img: prismaPatient.img ?? undefined,
      colorCode: prismaPatient.colorCode ?? undefined,
      createdAt: prismaPatient.created_at,
      updatedAt: prismaPatient.updated_at,
    });
  }

  /**
   * Maps a domain Patient entity to Prisma PatientCreateInput for creation
   * 
   * @param patient - Domain Patient entity
   * @returns Prisma PatientCreateInput for creating a new patient
   */
  static toPrismaCreateInput(patient: Patient): Prisma.PatientCreateInput {
    // In this system, when a patient has an account, their patient id equals their Clerk user_id
    // This allows GET /api/patients/:id to find patients by user_id for authenticated users
    return {
      id: patient.getId(),
      user_id: patient.getId(), // Link to User - set to same as id when patient has account
      file_number: patient.getFileNumber(), // System-generated: NS001, NS002, etc.
      first_name: patient.getFirstName(),
      last_name: patient.getLastName(),
      date_of_birth: patient.getDateOfBirth(),
      gender: patient.getGender(),
      email: patient.getEmail().getValue(),
      phone: patient.getPhone().getValue(),
      whatsapp_phone: patient.getWhatsappPhone() ?? null,
      address: patient.getAddress(),
      occupation: patient.getOccupation() ?? null,
      marital_status: patient.getMaritalStatus(),
      emergency_contact_name: patient.getEmergencyContactName(),
      emergency_contact_number: patient.getEmergencyContactNumber().getValue(),
      relation: patient.getRelation(),
      privacy_consent: patient.hasPrivacyConsent(),
      service_consent: patient.hasServiceConsent(),
      medical_consent: patient.hasMedicalConsent(),
      blood_group: patient.getBloodGroup() ?? null,
      allergies: patient.getAllergies() ?? null,
      medical_conditions: patient.getMedicalConditions() ?? null,
      medical_history: patient.getMedicalHistory() ?? null,
      insurance_provider: patient.getInsuranceProvider() ?? null,
      insurance_number: patient.getInsuranceNumber() ?? null,
      img: patient.getImg() ?? null,
      colorCode: patient.getColorCode() ?? null,
      // Timestamps will be set by Prisma automatically
    };
  }

  /**
   * Maps a domain Patient entity to Prisma PatientUpdateInput for updates
   * 
   * @param patient - Domain Patient entity with updated values
   * @returns Prisma PatientUpdateInput for updating an existing patient
   */
  static toPrismaUpdateInput(patient: Patient): Prisma.PatientUpdateInput {
    return {
      first_name: patient.getFirstName(),
      last_name: patient.getLastName(),
      date_of_birth: patient.getDateOfBirth(),
      gender: patient.getGender(),
      email: patient.getEmail().getValue(),
      phone: patient.getPhone().getValue(),
      whatsapp_phone: patient.getWhatsappPhone() ?? null,
      address: patient.getAddress(),
      occupation: patient.getOccupation() ?? null,
      marital_status: patient.getMaritalStatus(),
      emergency_contact_name: patient.getEmergencyContactName(),
      emergency_contact_number: patient.getEmergencyContactNumber().getValue(),
      relation: patient.getRelation(),
      privacy_consent: patient.hasPrivacyConsent(),
      service_consent: patient.hasServiceConsent(),
      medical_consent: patient.hasMedicalConsent(),
      blood_group: patient.getBloodGroup() ?? null,
      allergies: patient.getAllergies() ?? null,
      medical_conditions: patient.getMedicalConditions() ?? null,
      medical_history: patient.getMedicalHistory() ?? null,
      insurance_provider: patient.getInsuranceProvider() ?? null,
      insurance_number: patient.getInsuranceNumber() ?? null,
      img: patient.getImg() ?? null,
      colorCode: patient.getColorCode() ?? null,
      // updated_at will be set by Prisma automatically
    };
  }
}
