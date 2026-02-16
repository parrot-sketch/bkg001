import { describe, it, expect, beforeEach } from 'vitest';
import { Patient } from '@domain/entities/Patient';
import { Gender } from '@domain/enums/Gender';
import { Email } from '@domain/value-objects/Email';
import { PhoneNumber } from '@domain/value-objects/PhoneNumber';
import { DomainException } from '@domain/exceptions/DomainException';

describe('Patient Entity', () => {
  const validDateOfBirth = new Date('1990-01-01');
  const validEmail = 'patient@example.com';
  const validPhone = '1234567890';
  const validEmergencyPhone = '9876543210';

  const basePatientParams = {
    id: 'patient-123',
    fileNumber: 'NS001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: validDateOfBirth,
    gender: Gender.MALE,
    email: validEmail,
    phone: validPhone,
    address: '123 Main St',
    maritalStatus: 'single',
    emergencyContactName: 'Jane Doe',
    emergencyContactNumber: validEmergencyPhone,
    relation: 'spouse',
    privacyConsent: true,
    serviceConsent: true,
    medicalConsent: true,
  };

  describe('create', () => {
    it('should create a valid patient', () => {
      const patient = Patient.create(basePatientParams);

      expect(patient.getId()).toBe('patient-123');
      expect(patient.getFirstName()).toBe('John');
      expect(patient.getLastName()).toBe('Doe');
      expect(patient.getFullName()).toBe('John Doe');
      expect(patient.getGender()).toBe(Gender.MALE);
      expect(patient.getEmail().getValue()).toBe(validEmail);
      expect(patient.getPhone().getValue()).toBe(validPhone);
      expect(patient.hasAllConsents()).toBe(true);
    });

    it('should accept value objects for email and phone', () => {
      const email = Email.create(validEmail);
      const phone = PhoneNumber.create(validPhone);
      const emergencyPhone = PhoneNumber.create(validEmergencyPhone);

      const patient = Patient.create({
        ...basePatientParams,
        email,
        phone,
        emergencyContactNumber: emergencyPhone,
      });

      expect(patient.getEmail()).toBe(email);
      expect(patient.getPhone()).toBe(phone);
    });

    it('should trim string fields', () => {
      const patient = Patient.create({
        ...basePatientParams,
        firstName: '  John  ',
        lastName: '  Doe  ',
        address: '  123 Main St  ',
      });

      expect(patient.getFirstName()).toBe('John');
      expect(patient.getLastName()).toBe('Doe');
      expect(patient.getAddress()).toBe('123 Main St');
    });

    it('should handle optional fields', () => {
      const patient = Patient.create({
        ...basePatientParams,
        bloodGroup: 'O+',
        allergies: 'Peanuts',
        medicalConditions: 'Hypertension',
        insuranceProvider: 'Insurance Co',
        insuranceNumber: 'INS123',
      });

      expect(patient.getBloodGroup()).toBe('O+');
      expect(patient.getAllergies()).toBe('Peanuts');
      expect(patient.getMedicalConditions()).toBe('Hypertension');
      expect(patient.getInsuranceProvider()).toBe('Insurance Co');
      expect(patient.getInsuranceNumber()).toBe('INS123');
    });

    it('should reject empty ID', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          id: '',
        }),
      ).toThrow(DomainException);

      expect(() =>
        Patient.create({
          ...basePatientParams,
          id: '   ',
        }),
      ).toThrow(DomainException);
    });

    it('should reject empty first name', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          firstName: '',
        }),
      ).toThrow(DomainException);
    });

    it('should reject empty last name', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          lastName: '',
        }),
      ).toThrow(DomainException);
    });

    it('should reject invalid date of birth', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          dateOfBirth: null as any,
        }),
      ).toThrow(DomainException);

      expect(() =>
        Patient.create({
          ...basePatientParams,
          dateOfBirth: 'invalid' as any,
        }),
      ).toThrow(DomainException);
    });

    it('should reject date of birth in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      expect(() =>
        Patient.create({
          ...basePatientParams,
          dateOfBirth: futureDate,
        }),
      ).toThrow(DomainException);
    });

    it('should accept date of birth far in the past (legacy data tolerance)', () => {
      const veryOldDate = new Date();
      veryOldDate.setFullYear(veryOldDate.getFullYear() - 200); // 200 years ago

      // 150-year limit removed to support legacy data — only future dates are rejected
      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: veryOldDate,
      });
      expect(patient).toBeDefined();
    });

    it('should reject empty address', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          address: '',
        }),
      ).toThrow(DomainException);
    });

    it('should reject empty emergency contact name', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          emergencyContactName: '',
        }),
      ).toThrow(DomainException);
    });

    it('should reject invalid email format', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          email: 'invalid-email',
        }),
      ).toThrow(DomainException);
    });

    it('should reject invalid phone format', () => {
      expect(() =>
        Patient.create({
          ...basePatientParams,
          phone: '123', // Too short
        }),
      ).toThrow(DomainException);
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);
      dob.setMonth(0);
      dob.setDate(1);

      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: dob,
      });

      const age = patient.getAge();
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(26); // Allow for test execution timing
    });

    it('should handle birthday not yet occurred this year', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);
      dob.setMonth(11); // December
      dob.setDate(31);

      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: dob,
      });

      const age = patient.getAge();
      // Age should account for birthday not yet occurred
      expect(age).toBeGreaterThanOrEqual(23);
    });
  });

  describe('getAgeInMonths', () => {
    it('should calculate age in months for infants', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 6); // 6 months ago

      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: dob,
      });

      const ageInMonths = patient.getAgeInMonths();
      expect(ageInMonths).toBeGreaterThanOrEqual(5);
      expect(ageInMonths).toBeLessThanOrEqual(7);
    });
  });

  describe('isMinor', () => {
    it('should return true for patient under 18', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 17);

      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: dob,
      });

      expect(patient.isMinor()).toBe(true);
    });

    it('should return false for patient 18 or older', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);

      const patient = Patient.create({
        ...basePatientParams,
        dateOfBirth: dob,
      });

      expect(patient.isMinor()).toBe(false);
    });
  });

  describe('hasAllConsents', () => {
    it('should return true when all consents are provided', () => {
      const patient = Patient.create({
        ...basePatientParams,
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      expect(patient.hasAllConsents()).toBe(true);
    });

    it('should return false when any consent is missing', () => {
      const patient1 = Patient.create({
        ...basePatientParams,
        privacyConsent: false,
        serviceConsent: true,
        medicalConsent: true,
      });

      expect(patient1.hasAllConsents()).toBe(false);

      const patient2 = Patient.create({
        ...basePatientParams,
        privacyConsent: true,
        serviceConsent: false,
        medicalConsent: true,
      });

      expect(patient2.hasAllConsents()).toBe(false);
    });
  });

  describe('hasInsurance', () => {
    it('should return true when insurance provider and number are present', () => {
      const patient = Patient.create({
        ...basePatientParams,
        insuranceProvider: 'Insurance Co',
        insuranceNumber: 'INS123',
      });

      expect(patient.hasInsurance()).toBe(true);
    });

    it('should return false when insurance information is missing', () => {
      const patient1 = Patient.create({
        ...basePatientParams,
        insuranceProvider: undefined,
        insuranceNumber: 'INS123',
      });

      expect(patient1.hasInsurance()).toBe(false);

      const patient2 = Patient.create({
        ...basePatientParams,
        insuranceProvider: 'Insurance Co',
        insuranceNumber: undefined,
      });

      expect(patient2.hasInsurance()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for patients with same ID', () => {
      const patient1 = Patient.create({
        ...basePatientParams,
        id: 'patient-123',
      });

      const patient2 = Patient.create({
        ...basePatientParams,
        id: 'patient-123',
        firstName: 'Different', // Different data
      });

      expect(patient1.equals(patient2)).toBe(true);
    });

    it('should return false for patients with different ID', () => {
      const patient1 = Patient.create({
        ...basePatientParams,
        id: 'patient-123',
      });

      const patient2 = Patient.create({
        ...basePatientParams,
        id: 'patient-456',
      });

      expect(patient1.equals(patient2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const patient = Patient.create(basePatientParams);
      expect(patient.equals(null)).toBe(false);
      expect(patient.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const patient = Patient.create(basePatientParams);
      const str = patient.toString();

      expect(str).toContain('patient-123');
      expect(str).toContain('John Doe');
      expect(str).toContain(validEmail);
    });
  });

  describe('immutability', () => {
    it('should return copies of dates to maintain immutability', () => {
      const patient = Patient.create(basePatientParams);
      const dob1 = patient.getDateOfBirth();
      const dob2 = patient.getDateOfBirth();

      // Should be different Date instances
      expect(dob1).not.toBe(dob2);
      // But should represent the same date
      expect(dob1.getTime()).toBe(dob2.getTime());
    });

    it('should return copies of optional timestamps', () => {
      const createdAt = new Date();
      const patient = Patient.create({
        ...basePatientParams,
        createdAt,
        updatedAt: createdAt,
      });

      const created1 = patient.getCreatedAt();
      const created2 = patient.getCreatedAt();

      if (created1 && created2) {
        expect(created1).not.toBe(created2);
        expect(created1.getTime()).toBe(created2.getTime());
      }
    });
  });
});
