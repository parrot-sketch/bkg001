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
   * Sanitizes a phone number string by removing all non-digit characters except +
   * This handles legacy data that may have formatting characters
   * 
   * @param phone - Phone number string (may contain formatting)
   * @returns Sanitized phone number (digits only, with optional + prefix)
   * @throws Error if phone number is invalid or contains no digits after sanitization
   */
  private static sanitizePhoneNumber(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error(`Invalid phone number: ${phone}. Phone number must be a non-empty string.`);
    }
    
    const trimmed = phone.trim();
    if (trimmed.length === 0) {
      throw new Error('Phone number cannot be empty');
    }
    
    // Remove all non-digit, non-plus characters
    // Keep + only if it's at the start
    const hasPlus = trimmed.startsWith('+');
    let digitsOnly = trimmed.replace(/[^\d+]/g, '');
    
    // Remove any + that's not at the start
    if (digitsOnly.includes('+') && !digitsOnly.startsWith('+')) {
      digitsOnly = digitsOnly.replace(/\+/g, '');
    }
    
    // Extract actual digits (remove + for counting)
    let actualDigits = digitsOnly.replace(/\+/g, '');
    
    // Validate that we have digits after cleaning
    if (actualDigits.length === 0) {
      throw new Error(`Phone number contains no digits after sanitization. Original: "${phone}"`);
    }
    
    // Reconstruct the phone number: if it had a + at the start, add it back
    // But only if we have actual digits
    if (hasPlus && actualDigits.length > 0) {
      return '+' + actualDigits;
    }
    
    // Return digits only (no + prefix)
    return actualDigits;
  }

  /**
   * Maps a Prisma Patient model to a domain Patient entity
   * 
   * @param prismaPatient - Prisma Patient model from database
   * @returns Domain Patient entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaPatient: PrismaPatient): Patient {
    // Sanitize phone numbers before creating PhoneNumber value objects
    // This handles legacy data with formatting characters
    let sanitizedPhone: string;
    let sanitizedEmergencyPhone: string;
    
    try {
      sanitizedPhone = this.sanitizePhoneNumber(prismaPatient.phone);
    } catch (error) {
      throw new Error(
        `Failed to sanitize patient phone number for patient ${prismaPatient.id}. ` +
        `Original value: "${prismaPatient.phone}". ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    
    // Emergency contact phone: if sanitization fails, use patient's phone as fallback
    // This handles corrupted data like "+DR.KEN" or "+''''" in the database
    try {
      sanitizedEmergencyPhone = this.sanitizePhoneNumber(prismaPatient.emergency_contact_number);
    } catch (error) {
      // Log the issue but don't fail - use patient's phone as fallback
      console.warn(
        `[PatientMapper] Invalid emergency contact phone for patient ${prismaPatient.id}. ` +
        `Original value: "${prismaPatient.emergency_contact_number}". ` +
        `Using patient's phone as fallback: "${sanitizedPhone}"`
      );
      // Use patient's own phone number as emergency contact fallback
      sanitizedEmergencyPhone = sanitizedPhone;
    }
    
    // Validate and create email - handle invalid emails gracefully
    let email: Email;
    try {
      email = Email.create(prismaPatient.email);
    } catch (error) {
      // If email is invalid, create a placeholder email
      // Format: patient-{fileNumber}@invalid.local
      const placeholderEmail = `patient-${prismaPatient.file_number.replace(/[^a-zA-Z0-9]/g, '')}@invalid.local`;
      console.warn(
        `[PatientMapper] Invalid email for patient ${prismaPatient.id}. ` +
        `Original value: "${prismaPatient.email}". ` +
        `Using placeholder: "${placeholderEmail}"`
      );
      email = Email.create(placeholderEmail);
    }
    
    // Validate and create phone - handle short/invalid phones gracefully
    let phone: PhoneNumber;
    try {
      phone = PhoneNumber.create(sanitizedPhone);
    } catch (error) {
      // If phone is too short or invalid, try to create a valid placeholder
      // Use a default Kenyan phone format: +254700000000 (pad with zeros if needed)
      const MIN_PHONE_LENGTH = 10;
      let fallbackPhone: string;
      
      if (sanitizedPhone.startsWith('+')) {
        // If it has country code, try to pad the local part
        const countryCode = sanitizedPhone.substring(0, 4); // +254
        const localPart = sanitizedPhone.substring(4).replace(/\D/g, '');
        const paddedLocal = localPart.padEnd(MIN_PHONE_LENGTH, '0');
        fallbackPhone = countryCode + paddedLocal;
      } else {
        // No country code, pad to minimum length
        const padded = sanitizedPhone.replace(/\D/g, '').padEnd(MIN_PHONE_LENGTH, '0');
        fallbackPhone = padded.length >= MIN_PHONE_LENGTH ? `+254${padded}` : `+254${padded.padEnd(MIN_PHONE_LENGTH, '0')}`;
      }
      
      console.warn(
        `[PatientMapper] Invalid or too short phone for patient ${prismaPatient.id}. ` +
        `Original value: "${prismaPatient.phone}", sanitized: "${sanitizedPhone}". ` +
        `Using fallback: "${fallbackPhone}"`
      );
      
      try {
        phone = PhoneNumber.create(fallbackPhone);
        // Update sanitizedPhone for emergency contact fallback
        sanitizedPhone = fallbackPhone;
        sanitizedEmergencyPhone = fallbackPhone;
      } catch (fallbackError) {
        // Last resort: use a default valid phone number
        const defaultPhone = '+254700000000';
        console.error(
          `[PatientMapper] Even fallback phone failed for patient ${prismaPatient.id}. ` +
          `Using default: "${defaultPhone}"`
        );
        phone = PhoneNumber.create(defaultPhone);
        sanitizedPhone = defaultPhone;
        sanitizedEmergencyPhone = defaultPhone;
      }
    }
    
    return Patient.create({
      id: prismaPatient.id,
      fileNumber: prismaPatient.file_number, // Required field
      firstName: prismaPatient.first_name,
      lastName: prismaPatient.last_name,
      dateOfBirth: prismaPatient.date_of_birth,
      gender: prismaPatient.gender as Gender,
      email: email,
      phone: phone,
      whatsappPhone: prismaPatient.whatsapp_phone ? (() => {
        try {
          return this.sanitizePhoneNumber(prismaPatient.whatsapp_phone);
        } catch (error) {
          // If WhatsApp phone is invalid, just skip it (it's optional)
          console.warn(
            `[PatientMapper] Invalid WhatsApp phone for patient ${prismaPatient.id}. ` +
            `Original value: "${prismaPatient.whatsapp_phone}". Skipping.`
          );
          return undefined;
        }
      })() : undefined,
      address: prismaPatient.address,
      occupation: prismaPatient.occupation ?? undefined,
      maritalStatus: prismaPatient.marital_status,
      emergencyContactName: prismaPatient.emergency_contact_name,
      emergencyContactNumber: (() => {
        try {
          return PhoneNumber.create(sanitizedEmergencyPhone);
        } catch (error) {
          // If emergency contact phone is still invalid, use patient's phone
          console.warn(
            `[PatientMapper] Emergency contact phone validation failed for patient ${prismaPatient.id}. ` +
            `Using patient's phone as fallback.`
          );
          return phone; // Use the validated patient phone
        }
      })(),
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
    const userId = patient.getId(); // Link to User - set to same as id when patient has account
    return {
      id: patient.getId(),
      ...(userId ? { user: { connect: { id: userId } } } : {}), // Use relation syntax if user_id exists
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
