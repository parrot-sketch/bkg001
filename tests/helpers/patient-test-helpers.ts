/**
 * Test Helpers: Patient Test Utilities
 * 
 * Provides helper functions for creating test Patient entities with valid data.
 * This ensures consistency across all tests and reduces boilerplate.
 */

/**
 * Generates a valid file number for testing
 * Format: NS001, NS002, etc.
 * 
 * @param index - Optional index to generate unique file numbers (default: 1)
 * @returns Valid file number string
 */
export function generateTestFileNumber(index: number = 1): string {
  return `NS${String(index).padStart(3, '0')}`;
}

/**
 * Creates a minimal valid Patient.create() parameters object for testing
 * All required fields are provided with sensible defaults
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns Patient creation parameters
 */
export function createTestPatientParams(overrides: Partial<{
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: any;
  email: string;
  phone: string;
  address: string;
  maritalStatus: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relation: string;
  privacyConsent: boolean;
  serviceConsent: boolean;
  medicalConsent: boolean;
}> = {}) {
  const index = Math.floor(Math.random() * 1000) + 1;
  
  return {
    id: `patient-${index}`,
    fileNumber: generateTestFileNumber(index),
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE' as any,
    email: `test${index}@example.com`,
    phone: `123456789${index}`,
    address: '123 Test St',
    maritalStatus: 'Single',
    emergencyContactName: 'Jane Doe',
    emergencyContactNumber: `098765432${index}`,
    relation: 'Spouse',
    privacyConsent: true,
    serviceConsent: true,
    medicalConsent: true,
    ...overrides,
  };
}
