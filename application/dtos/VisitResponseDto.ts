/**
 * VisitResponseDto — Represents a complete patient visit
 *
 * A "visit" is the atomic unit of a patient's encounter with the clinic.
 * It joins: Appointment + Consultation + Vitals + Diagnosis + Billing + Queue
 */

export interface VisitVital {
  id: number;
  bodyTemperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: string | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  recordedAt: string;
  recordedByName: string | null;
}

export interface VisitDiagnosis {
  id: number;
  symptoms: string;
  diagnosis: string;
  notes: string | null;
  prescribedMedications: string | null;
  followUpPlan: string | null;
}

export interface VisitMedicalRecord {
  id: number;
  treatmentPlan: string | null;
  prescriptions: string | null;
  labRequest: string | null;
  notes: string | null;
  diagnoses: VisitDiagnosis[];
}

export interface VisitBillingItem {
  id: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface VisitBilling {
  id: number;
  totalAmount: number;
  amountPaid: number;
  discount: number;
  status: 'PAID' | 'UNPAID' | 'PART';
  paymentMethod: string | null;
  receiptNumber: string | null;
  billDate: string;
  items: VisitBillingItem[];
}

export interface VisitConsultation {
  id: number;
  chiefComplaint: string | null;
  examination: string | null;
  assessment: string | null;
  plan: string | null;
  doctorNotes: string | null;
  outcome: string | null;
  outcomeType: string | null;
  patientDecision: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
}

export interface VisitResponseDto {
  // Appointment core
  id: number;
  date: string;
  time: string;
  type: string;
  status: string;
  note: string | null;

  // Doctor
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
  } | null;

  // Check-in
  checkedInAt: string | null;
  lateArrival: boolean;
  lateByMinutes: number | null;

  // Consultation timeline
  consultationStartedAt: string | null;
  consultationEndedAt: string | null;
  consultationDuration: number | null;

  // Related data
  consultation: VisitConsultation | null;
  vitals: VisitVital[];
  medicalRecords: VisitMedicalRecord[];
  billing: VisitBilling | null;
}
