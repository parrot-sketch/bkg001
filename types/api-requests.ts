/**
 * API Request Types
 * 
 * Type definitions for all API route request bodies.
 * These types ensure type safety at API boundaries.
 */

/**
 * Create Appointment Request
 */
export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  appointmentDate: string; // ISO date string
  time: string; // HH:mm format
  type?: string;
  note?: string;
  reason?: string;
}

/**
 * Update Appointment Request
 */
export interface UpdateAppointmentRequest {
  appointmentDate?: string;
  time?: string;
  status?: 'PENDING' | 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  type?: string;
  note?: string;
  reason?: string;
}

/**
 * Create Patient Request
 * 
 * Note: date_of_birth accepts both Date (from forms) and string (from API)
 * to handle different input sources gracefully.
 */
export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string | Date; // Accepts both Date (forms) and string (API)
  gender?: 'MALE' | 'FEMALE';
  address?: string;
  marital_status?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  relation?: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  medical_history?: string;
  insurance_provider?: string;
  insurance_number?: string;
  privacy_consent?: boolean;
  service_consent?: boolean;
  medical_consent?: boolean;
  password?: string;
  occupation?: string;
  whatsapp_phone?: string;
  dob?: string | Date; // Alternative field name (also accepts both)
}

/**
 * Update Patient Request
 * 
 * Note: date_of_birth accepts both Date (from forms) and string (from API)
 * to handle different input sources gracefully.
 */
export interface UpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string | Date; // Accepts both Date (forms) and string (API)
  gender?: 'MALE' | 'FEMALE';
  address?: string;
  marital_status?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  relation?: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  medical_history?: string;
  insurance_provider?: string;
  insurance_number?: string;
  privacy_consent?: boolean;
  service_consent?: boolean;
  medical_consent?: boolean;
  occupation?: string;
  whatsapp_phone?: string;
}

/**
 * Create Staff Request
 */
export interface CreateStaffRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'NURSE' | 'FRONTDESK' | 'CASHIER';
  phone?: string;
  address?: string;
}

/**
 * Create Doctor Request
 */
export interface CreateDoctorRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialization: string;
  licenseNumber: string;
  phone: string;
  address: string;
  clinicLocation?: string;
  profileImage?: string;
  bio?: string;
  education?: string;
  focusAreas?: string;
  professionalAffiliations?: string;
  workingDays?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
}

/**
 * Complete Consultation Request
 */
export interface CompleteConsultationRequest {
  outcome: string;
  outcomeType: 'PROCEDURE_RECOMMENDED' | 'CONSULTATION_ONLY' | 'FOLLOW_UP_CONSULTATION_NEEDED' | 'PATIENT_DECIDING' | 'REFERRAL_NEEDED';
  patientDecision?: 'YES' | 'NO' | 'PENDING';
  procedureRecommended?: {
    procedureType?: string;
    urgency?: string;
    notes?: string;
  };
  referralInfo?: {
    doctorName?: string;
    reason?: string;
    contactInfo?: string;
  };
  followUpDate?: string;
  followUpTime?: string;
  followUpType?: string;
}

/**
 * Record Vitals Request
 */
export interface RecordVitalsRequest {
  patientId: string;
  appointmentId?: number;
  bodyTemperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: string;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

/**
 * Add Care Note Request
 */
export interface AddCareNoteRequest {
  patientId: string;
  appointmentId?: number;
  noteType: 'PRE_OP' | 'POST_OP' | 'GENERAL';
  content: string;
  recordedBy: string;
}

/**
 * Approve Patient Request
 */
export interface ApprovePatientRequest {
  notes?: string;
}

/**
 * Assign Patient Request
 */
export interface AssignPatientRequest {
  assignedToUserId: string;
}

/**
 * Update Doctor Profile Request
 */
export interface UpdateDoctorProfileRequest {
  specialization?: string;
  licenseNumber?: string;
  phone?: string;
  address?: string;
  clinicLocation?: string;
  profileImage?: string;
  bio?: string;
  education?: string;
  focusAreas?: string;
  professionalAffiliations?: string;
}

/**
 * Update Doctor Availability Request
 */
export interface UpdateDoctorAvailabilityRequest {
  workingDays?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
}

/**
 * Generate Report Request
 */
export interface GenerateReportRequest {
  reportType: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, unknown>;
}
