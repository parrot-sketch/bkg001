'use server';

import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { toIso } from '@/lib/utils/dates';

export interface ConsultationPatientData {
  patient: {
    id: string;
    fileNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    bloodGroup: string | null;
    allergies: string | null;
    medicalConditions: string | null;
    emergencyContactName: string | null;
    emergencyContactNumber: string | null;
    relation: string | null;
  };
  appointment: {
    id: number;
    status: string;
    type: string;
    time: string;
    appointmentDate: string;
    doctorId: string;
  };
  vitals: {
    bodyTemperature: number | null;
    systolic: number | null;
    diastolic: number | null;
    heartRate: string | null;
    respiratoryRate: number | null;
    oxygenSaturation: number | null;
    weight: number | null;
    height: number | null;
    recordedAt: string;
    recordedBy: string | null;
  } | null;
  consultation: {
    id: number;
    doctorId: string;
    state: string;
    notes: {
      fullText: string;
      structured?: {
        chiefComplaint?: string;
        examination?: string;
        assessment?: string;
        plan?: string;
      };
    } | null;
    outcomeType: string | null;
    patientDecision: string | null;
  } | null;
}

export async function getConsultationPatientData(
  appointmentId: number
): Promise<{ success: true; data: ConsultationPatientData } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Single query: appointment + patient join
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        type: true,
        time: true,
        appointment_date: true,
        doctor_id: true,
        patient: {
          select: {
            id: true,
            file_number: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            gender: true,
            email: true,
            phone: true,
            address: true,
            blood_group: true,
            allergies: true,
            medical_conditions: true,
            emergency_contact_name: true,
            emergency_contact_number: true,
            relation: true,
          },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    if (!appointment.patient) {
      return { success: false, error: 'Patient not found' };
    }

    const doctorRecord = await db.doctor.findFirst({
      where: { user_id: user.userId },
      select: { id: true },
    });

    if (!doctorRecord || appointment.doctor_id !== doctorRecord.id) {
      return { success: false, error: 'Not authorized for this appointment' };
    }

    // Fetch most recent vitals for this patient (one extra query, still O(1))
    const vitalsRecord = await db.vitalSign.findFirst({
      where: { patient_id: appointment.patient.id },
      orderBy: { recorded_at: 'desc' },
      select: {
        body_temperature: true,
        systolic: true,
        diastolic: true,
        heart_rate: true,
        respiratory_rate: true,
        oxygen_saturation: true,
        weight: true,
        height: true,
        recorded_at: true,
        recorded_by: true,
      },
    });

    // Fetch consultation notes for this appointment
    const consultationRecord = await db.consultation.findFirst({
      where: { appointment_id: appointmentId },
      select: {
        id: true,
        appointment_id: true,
        doctor_id: true,
        user_id: true,
        started_at: true,
        completed_at: true,
        duration_minutes: true,
        outcome_type: true,
        patient_decision: true,
        assessment: true,
        chief_complaint: true,
        examination: true,
        plan: true,
        doctor_notes: true,
        created_at: true,
        updated_at: true,
      },
    });

    const p = appointment.patient;

    type StructuredNotes = {
      chiefComplaint?: string;
      examination?: string;
      assessment?: string;
      plan?: string;
    };

    const structuredNotes: StructuredNotes | null =
      consultationRecord?.chief_complaint ||
      consultationRecord?.examination ||
      consultationRecord?.assessment ||
      consultationRecord?.plan
        ? {
            chiefComplaint: consultationRecord.chief_complaint ?? undefined,
            examination: consultationRecord.examination ?? undefined,
            assessment: consultationRecord.assessment ?? undefined,
            plan: consultationRecord.plan ?? undefined,
          }
        : null;

    const parsedNotes: { fullText: string; structured?: StructuredNotes } | null =
      consultationRecord || structuredNotes
        ? {
            fullText:
              (consultationRecord?.doctor_notes as string | undefined) ??
              (structuredNotes
                ? [structuredNotes.chiefComplaint, structuredNotes.examination, structuredNotes.assessment, structuredNotes.plan]
                    .filter(Boolean)
                    .join('\n\n')
                : ''),
            structured: structuredNotes ?? undefined,
          }
        : null;

    const deriveState = (record: typeof consultationRecord): string => {
      if (!record) return 'NOT_STARTED';
      if (record.completed_at) return 'COMPLETED';
      if (record.started_at) return 'IN_PROGRESS';
      return 'NOT_STARTED';
    };

    return {
      success: true,
      data: {
        patient: {
          id: p.id,
          fileNumber: p.file_number ?? '',
          firstName: p.first_name,
          lastName: p.last_name,
          dateOfBirth: toIso(p.date_of_birth) ?? null,
          gender: p.gender ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          address: p.address ?? null,
          bloodGroup: p.blood_group ?? null,
          allergies: p.allergies ?? null,
          medicalConditions: p.medical_conditions ?? null,
          emergencyContactName: p.emergency_contact_name ?? null,
          emergencyContactNumber: p.emergency_contact_number ?? null,
          relation: p.relation ?? null,
        },
        appointment: {
          id: appointment.id,
          status: appointment.status,
          type: appointment.type ?? 'Consultation',
          time: appointment.time ?? '',
          appointmentDate: toIso(appointment.appointment_date) ?? '',
          doctorId: appointment.doctor_id,
        },
        vitals: vitalsRecord
          ? {
              bodyTemperature: vitalsRecord.body_temperature ? Number(vitalsRecord.body_temperature) : null,
              systolic: vitalsRecord.systolic ?? null,
              diastolic: vitalsRecord.diastolic ?? null,
              heartRate: vitalsRecord.heart_rate ?? null,
              respiratoryRate: vitalsRecord.respiratory_rate ?? null,
              oxygenSaturation: vitalsRecord.oxygen_saturation ? Number(vitalsRecord.oxygen_saturation) : null,
              weight: vitalsRecord.weight ? Number(vitalsRecord.weight) : null,
              height: vitalsRecord.height ? Number(vitalsRecord.height) : null,
              recordedAt: toIso(vitalsRecord.recorded_at) ?? '',
              recordedBy: vitalsRecord.recorded_by ?? null,
            }
          : null,
        consultation: consultationRecord
          ? {
              id: consultationRecord.id,
              doctorId: consultationRecord.doctor_id,
              state: deriveState(consultationRecord),
              notes: parsedNotes,
              outcomeType: consultationRecord.outcome_type ?? null,
              patientDecision: consultationRecord.patient_decision ?? null,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('[getConsultationPatientData] error:', error);
    return { success: false, error: 'Failed to load patient data' };
  }
}
