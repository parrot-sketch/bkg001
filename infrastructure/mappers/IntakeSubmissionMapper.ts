import { IntakeSubmission, Relationship, MaritalStatus, BloodGroup } from '@/domain/entities/IntakeSubmission';
import type { IntakeSubmission as PrismaIntakeSubmission } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { Gender } from '@/domain/enums/Gender';
import { CorruptedDataError } from '@/domain/errors/IntakeErrors';

/**
 * Mapper: IntakeSubmission ↔ Prisma
 *
 * Pure data transformation only — no business logic, no fallback defaults.
 * If a record cannot be mapped (e.g., missing required fields), throws CorruptedDataError.
 */
export class IntakeSubmissionMapper {
  static toDomain(raw: PrismaIntakeSubmission): IntakeSubmission {
    try {
      return IntakeSubmission.create({
        submissionId: raw.submission_id,
        sessionId: raw.session_id,
        firstName: raw.first_name,
        lastName: raw.last_name,
        dateOfBirth: raw.date_of_birth,
        gender: (raw.gender as Gender) || Gender.FEMALE,
        email: raw.email,
        phone: raw.phone,
        address: raw.address ?? undefined,
        maritalStatus: (raw.marital_status as MaritalStatus) ?? undefined,
        occupation: raw.occupation ?? undefined,
        whatsappPhone: raw.whatsapp_phone ?? undefined,
        emergencyContactName: raw.emergency_contact_name ?? undefined,
        emergencyContactNumber: raw.emergency_contact_number ?? undefined,
        emergencyContactRelation: (raw.relation as Relationship) ?? undefined,
        bloodGroup: (raw.blood_group as BloodGroup) ?? undefined,
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
      throw new CorruptedDataError(
        raw.submission_id,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  static toPersistence(submission: IntakeSubmission): Prisma.IntakeSubmissionCreateInput {
    const p = submission.toPrimitive();
    return {
      submission_id: p.submissionId,
      session: { connect: { session_id: p.sessionId } },
      first_name: p.personalInfo.firstName,
      last_name: p.personalInfo.lastName,
      date_of_birth: new Date(p.personalInfo.dateOfBirth),
      gender: p.personalInfo.gender,
      email: p.contactInfo.email,
      phone: p.contactInfo.phone,
      whatsapp_phone: p.contactInfo.whatsappPhone ?? null,
      address: p.contactInfo.address ?? null,
      marital_status: p.contactInfo.maritalStatus ?? null,
      occupation: p.contactInfo.occupation ?? null,
      emergency_contact_name: p.emergencyContact.name ?? null,
      emergency_contact_number: p.emergencyContact.phoneNumber ?? null,
      relation: p.emergencyContact.relationship ?? null,
      blood_group: p.medicalInfo.bloodGroup ?? null,
      allergies: p.medicalInfo.allergies ?? null,
      medical_conditions: p.medicalInfo.medicalConditions ?? null,
      medical_history: p.medicalInfo.medicalHistory ?? null,
      insurance_provider: p.insuranceInfo.provider ?? null,
      insurance_number: p.insuranceInfo.number ?? null,
      privacy_consent: p.consent.privacyConsent,
      service_consent: p.consent.serviceConsent,
      medical_consent: p.consent.medicalConsent,
      submitted_at: new Date(p.submittedAt),
      ip_address: submission.getIpAddress() ?? null,
      user_agent: submission.getUserAgent() ?? null,
      status: 'PENDING',
    };
  }
}
