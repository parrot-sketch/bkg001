import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

export interface ConsultationRecord {
  id: number;
  appointmentId: number;
  chiefComplaint: string;
  examination: string;
  assessment: string;
  plan: string;
  outcomeType?: string;
  completedAt?: string;
  durationMinutes?: number;
  surgicalCaseId?: string;
  isSurgicalPlanComplete?: boolean;
  appointment: AppointmentResponseDto;
  hasSurgicalCase: boolean;
  payment: PaymentData | null;
}

export interface PaymentData {
  id: number;
  chargeSheetNo: string | null;
  totalAmount: number;
  discount: number;
  amountPaid: number;
  status: string;
  finalizedAt?: string;
  billItems: BillItem[];
}

export interface BillItem {
  id: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ClinicalNote {
  title: string;
  content: string | null | undefined;
  icon: 'user' | 'activity' | 'clipboard' | 'fileText';
}

export interface ConsultationItem {
  id: number;
  outcome_type?: string | null;
  outcomeType?: string | null;
  completed_at?: string | Date | null;
  completedAt?: string | Date | null;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  has_surgical_case?: boolean | null;
  hasCasePlan?: boolean | null;
  case_plan_id?: number | null;
  casePlanId?: number | null;
  appointment?: {
    id?: number;
    type?: string;
    patient?: {
      id?: string;
      first_name?: string;
      firstName?: string;
      last_name?: string;
      lastName?: string;
      file_number?: string;
      fileNumber?: string;
    };
    payments?: {
      id: number;
      status: string;
      total_amount: number;
      bill_items: { id: number }[];
    } | null;
  };
}

export function calculateAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
