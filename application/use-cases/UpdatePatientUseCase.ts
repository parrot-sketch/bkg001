import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { Patient } from '@/domain/entities/Patient';
import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { Gender } from '@/domain/enums/Gender';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import {
  PatientNotFoundError,
  DuplicatePatientError,
  ValidationError,
} from '@/domain/errors/IntakeErrors';
import type { PatientDetailDto } from '@/application/dtos/PatientDetailDto';
import { z } from 'zod';

const UpdatePatientSchema = PatientIntakeFormSchema.partial();

type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

export class UpdatePatientUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(
    patientId: string,
    data: Record<string, unknown>,
    auditContext: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<PatientDetailDto> {
    // 1. Fetch existing patient
    const existing = await this.patientRepo.findById(patientId);
    if (!existing) throw new PatientNotFoundError(patientId);

    // 2. Validate partial update data
    const result = UpdatePatientSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid patient data', result.error.flatten().fieldErrors as any);
    }
    const d = result.data;

    // 3. Check email uniqueness if email is being changed
    if (d.email && d.email !== existing.getEmail().getValue()) {
      const duplicate = await this.patientRepo.findByEmail(Email.create(d.email));
      if (duplicate) {
        throw new DuplicatePatientError(d.email, duplicate.getFileNumber(), duplicate.getId());
      }
    }

    // 4. Build updated entity (immutable — new instance)
    const updated = Patient.create({
      id: existing.getId(),
      fileNumber: existing.getFileNumber(),
      firstName: d.firstName ?? existing.getFirstName(),
      lastName: d.lastName ?? existing.getLastName(),
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : existing.getDateOfBirth(),
      gender: (d.gender as Gender) ?? existing.getGender(),
      email: d.email ? Email.create(d.email) : existing.getEmail(),
      phone: d.phone ? PhoneNumber.create(d.phone) : existing.getPhone(),
      whatsappPhone: d.whatsappPhone ?? existing.getWhatsappPhone(),
      address: d.address ?? existing.getAddress(),
      maritalStatus: d.maritalStatus ?? existing.getMaritalStatus(),
      occupation: d.occupation ?? existing.getOccupation(),
      emergencyContactName: d.emergencyContactName ?? existing.getEmergencyContactName(),
      emergencyContactNumber: d.emergencyContactNumber
        ? PhoneNumber.create(d.emergencyContactNumber)
        : existing.getEmergencyContactNumber(),
      relation: d.emergencyContactRelation ?? existing.getRelation(),
      bloodGroup: d.bloodGroup ?? existing.getBloodGroup(),
      allergies: d.allergies ?? existing.getAllergies(),
      medicalConditions: d.medicalConditions ?? existing.getMedicalConditions(),
      medicalHistory: existing.getMedicalHistory(),
      privacyConsent: existing.hasPrivacyConsent(),
      serviceConsent: existing.hasServiceConsent(),
      medicalConsent: existing.hasMedicalConsent(),
      colorCode: existing.getColorCode(),
      img: existing.getImg(),
    });

    // 5. Persist
    await this.patientRepo.update(updated);

    // 6. Audit
    await this.auditLogger.log({
      action: 'UPDATE',
      model: 'Patient',
      recordId: patientId,
      details: `Updated fields: ${Object.keys(data).join(', ')}`,
      context: auditContext,
    });

    // 7. Return DTO
    return patientToDetailDto(updated, 0, null);
  }
}

// ── Shared helper ──

export function patientToDetailDto(
  patient: Patient,
  totalAppointments: number,
  lastVisitAt: Date | null,
): PatientDetailDto {
  return {
    id: patient.getId(),
    fileNumber: patient.getFileNumber(),
    firstName: patient.getFirstName(),
    lastName: patient.getLastName(),
    email: patient.getEmail().getValue(),
    phone: patient.getPhone().getValue(),
    dateOfBirth: patient.getDateOfBirth().toISOString(),
    gender: patient.getGender(),
    address: patient.getAddress(),
    maritalStatus: patient.getMaritalStatus(),
    occupation: patient.getOccupation(),
    whatsappPhone: patient.getWhatsappPhone(),
    bloodGroup: patient.getBloodGroup(),
    allergies: patient.getAllergies(),
    medicalConditions: patient.getMedicalConditions(),
    medicalHistory: patient.getMedicalHistory(),
    insuranceProvider: patient.getInsuranceProvider(),
    insuranceNumber: patient.getInsuranceNumber(),
    emergencyContactName: patient.getEmergencyContactName(),
    emergencyContactNumber: patient.getEmergencyContactNumber()?.getValue(),
    relation: patient.getRelation(),
    profileImage: patient.getImg(),
    colorCode: patient.getColorCode(),
    createdAt: (patient.getCreatedAt() ?? new Date()).toISOString(),
    updatedAt: (patient.getUpdatedAt() ?? new Date()).toISOString(),
    totalAppointments,
    lastVisitAt: lastVisitAt?.toISOString() ?? null,
  };
}
