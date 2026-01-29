import { IntakeSubmission, Relationship, MaritalStatus, BloodGroup } from '@/domain/entities/IntakeSubmission';
import { IntakeSubmission as PrismaIntakeSubmission, Prisma } from '@prisma/client';
import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';

/**
 * Mapper: IntakeSubmissionMapper
 *
 * Maps between:
 * - Domain: IntakeSubmission aggregate
 * - Persistence: Prisma IntakeSubmission model
 * - API: PatientIntakeSubmissionDto
 * - Patient: Patient.CreateInput (for converting to Patient entity)
 */
export class IntakeSubmissionMapper {
  /**
   * Convert Prisma record to domain entity
   */
  static toDomain(raw: PrismaIntakeSubmission): IntakeSubmission {
    try {
      return IntakeSubmission.create({
        submissionId: raw.submission_id,
        sessionId: raw.session_id,
        firstName: raw.first_name || 'Unknown',
        lastName: raw.last_name || 'Unknown',
        dateOfBirth: raw.date_of_birth || new Date(),
        gender: (raw.gender as 'MALE' | 'FEMALE') || 'FEMALE',
        email: raw.email || 'unknown@example.com',
        phone: raw.phone || '0000000000',
        address: raw.address || 'Unknown Address',
        maritalStatus: (raw.marital_status as MaritalStatus) || 'SINGLE',
        occupation: raw.occupation ?? undefined,
        whatsappPhone: raw.whatsapp_phone ?? undefined,
        emergencyContactName: raw.emergency_contact_name || 'Unknown',
        emergencyContactNumber: raw.emergency_contact_number || '0000000000',
        emergencyContactRelation: (raw.relation as Relationship) || 'OTHER',
        bloodGroup: raw.blood_group as BloodGroup | undefined,
        allergies: raw.allergies ?? undefined,
        medicalConditions: raw.medical_conditions ?? undefined,
        medicalHistory: raw.medical_history ?? undefined,
        insuranceProvider: raw.insurance_provider ?? undefined,
        insuranceNumber: raw.insurance_number ?? undefined,
        privacyConsent: raw.privacy_consent ?? true,
        serviceConsent: raw.service_consent ?? true,
        medicalConsent: raw.medical_consent ?? true,
        ipAddress: raw.ip_address ?? undefined,
        userAgent: raw.user_agent ?? undefined,
      });
    } catch (error) {
      // If validation fails, restore as-is without re-validating if possible,
      // or at least return a placeholder object that won't crash the UI.
      console.warn('[IntakeSubmissionMapper] Error creating domain entity from raw record:', error);

      // We fall back to restore which is less strict if needed, 
      // but for now we just re-throw or handle at the repository level.
      throw error;
    }
  }

  /**
   * Convert domain entity to Prisma persistence format
   */
  static toPersistence(submission: IntakeSubmission): Prisma.IntakeSubmissionCreateInput {
    const primitive = submission.toPrimitive();
    const personal = primitive.personalInfo;
    const contact = primitive.contactInfo;
    const emergency = primitive.emergencyContact;
    const medical = primitive.medicalInfo;
    const insurance = primitive.insuranceInfo;
    const consent = primitive.consent;

    return {
      submission_id: primitive.submissionId,
      session: {
        connect: {
          session_id: primitive.sessionId,
        },
      },
      first_name: personal.firstName,
      last_name: personal.lastName,
      date_of_birth: new Date(personal.dateOfBirth),
      gender: personal.gender,
      email: contact.email,
      phone: contact.phone,
      whatsapp_phone: contact.whatsappPhone,
      address: contact.address,
      marital_status: contact.maritalStatus,
      occupation: contact.occupation,
      emergency_contact_name: emergency.name,
      emergency_contact_number: emergency.phoneNumber,
      relation: emergency.relationship,
      blood_group: medical.bloodGroup,
      allergies: medical.allergies,
      medical_conditions: medical.medicalConditions,
      medical_history: medical.medicalHistory,
      insurance_provider: insurance.provider,
      insurance_number: insurance.number,
      privacy_consent: consent.privacyConsent,
      service_consent: consent.serviceConsent,
      medical_consent: consent.medicalConsent,
      submitted_at: new Date(primitive.submittedAt),
      ip_address: submission.getIpAddress(),
      user_agent: submission.getUserAgent(),
      status: 'PENDING',
    };
  }

  /**
   * Convert domain entity to API DTO
   */
  static toDto(submission: IntakeSubmission) {
    const primitive = submission.toPrimitive();
    return {
      submissionId: primitive.submissionId,
      sessionId: primitive.sessionId,
      personalInfo: primitive.personalInfo,
      contactInfo: primitive.contactInfo,
      emergencyContact: primitive.emergencyContact,
      medicalInfo: primitive.medicalInfo,
      insuranceInfo: primitive.insuranceInfo,
      consent: primitive.consent,
      submittedAt: primitive.submittedAt,
      status: primitive.status,
      completenessScore: primitive.completenessScore,
      isComplete: primitive.isComplete,
    };
  }

  /**
   * Convert Prisma record to API DTO directly
   * (more efficient if only displaying, not needing domain logic)
   */
  static toPrismaDto(raw: PrismaIntakeSubmission) {
    return {
      sessionId: raw.session_id,
      submittedAt: raw.submitted_at.toISOString(),
      patientData: {
        firstName: raw.first_name,
        lastName: raw.last_name,
        email: raw.email,
        phone: raw.phone,
        dateOfBirth: raw.date_of_birth.toISOString(),
        gender: raw.gender,
        address: raw.address,
      },
      completenessScore: this.calculateCompletenessScore(raw),
      missingFields: this.getMissingFields(raw),
    };
  }

  /**
   * Convert intake submission to Patient creation input
   * Used when frontdesk confirms intake
   */
  static toPatientCreateInput(
    submission: IntakeSubmission,
    fileNumber: string,
    id: string,
  ): Parameters<typeof import('@/domain/entities/Patient').Patient.create>[0] {
    const primitive = submission.toPrimitive();
    const personal = primitive.personalInfo;
    const contact = primitive.contactInfo;
    const emergency = primitive.emergencyContact;
    const medical = primitive.medicalInfo;
    const insurance = primitive.insuranceInfo;
    const consent = primitive.consent;

    return {
      id,
      fileNumber,
      firstName: personal.firstName,
      lastName: personal.lastName,
      dateOfBirth: new Date(personal.dateOfBirth),
      gender: personal.gender as any, // Cast to match Prisma Gender enum
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      maritalStatus: contact.maritalStatus,
      occupation: contact.occupation,
      whatsappPhone: contact.whatsappPhone,
      emergencyContactName: emergency.name,
      emergencyContactNumber: emergency.phoneNumber,
      relation: emergency.relationship,
      bloodGroup: medical.bloodGroup,
      allergies: medical.allergies,
      medicalConditions: medical.medicalConditions,
      medicalHistory: medical.medicalHistory,
      insuranceProvider: insurance.provider,
      insuranceNumber: insurance.number,
      privacyConsent: consent.privacyConsent,
      serviceConsent: consent.serviceConsent,
      medicalConsent: consent.medicalConsent,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static calculateCompletenessScore(raw: PrismaIntakeSubmission): number {
    let score = 70; // Base score for required fields

    if (raw.blood_group) score += 5;
    if (raw.allergies && raw.allergies.trim().length > 0) score += 5;
    if (raw.medical_conditions && raw.medical_conditions.trim().length > 0) score += 5;
    if (raw.medical_history && raw.medical_history.trim().length > 0) score += 5;
    if (raw.insurance_provider && raw.insurance_number) score += 5;

    return Math.min(score, 100);
  }

  private static getMissingFields(raw: PrismaIntakeSubmission): string[] {
    const missing: string[] = [];

    if (!raw.first_name) missing.push('firstName');
    if (!raw.last_name) missing.push('lastName');
    if (!raw.date_of_birth) missing.push('dateOfBirth');
    if (!raw.email) missing.push('email');
    if (!raw.phone) missing.push('phone');
    if (!raw.address) missing.push('address');
    if (!raw.emergency_contact_name) missing.push('emergencyContactName');
    if (!raw.emergency_contact_number) missing.push('emergencyContactNumber');

    return missing;
  }
}
