/**
 * API Route: GET /api/patients/:id/visits
 *
 * Returns complete visit history for a patient.
 * A "visit" is an Appointment joined with: Consultation, Vitals, Diagnosis, Billing.
 * Used by the doctor patient profile page to show full visit details.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import type { VisitResponseDto, VisitVital, VisitMedicalRecord, VisitBilling, VisitBillingItem, VisitConsultation } from '@/application/dtos/VisitResponseDto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const patientId = resolvedParams.id;
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    // Resolve doctor from authenticated user
    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });

    // Allow filtering: by default show only this doctor's visits
    // Pass ?scope=all to see all doctors' visits (for patient history context)
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const appointmentFilter: any = { patient_id: patientId };
    if (doctor && scope !== 'all') {
      appointmentFilter.doctor_id = doctor.id;
    }

    const appointments = await db.appointment.findMany({
      where: appointmentFilter,
      orderBy: { appointment_date: 'desc' },
      take: 100,
      select: {
        id: true,
        appointment_date: true,
        time: true,
        type: true,
        status: true,
        note: true,
        checked_in_at: true,
        late_arrival: true,
        late_by_minutes: true,
        consultation_started_at: true,
        consultation_ended_at: true,
        consultation_duration: true,
        created_at: true,

        doctor: {
          select: { id: true, name: true, specialization: true },
        },

        consultation: {
          select: {
            id: true,
            chief_complaint: true,
            examination: true,
            assessment: true,
            plan: true,
            doctor_notes: true,
            outcome: true,
            outcome_type: true,
            patient_decision: true,
            started_at: true,
            completed_at: true,
            duration_minutes: true,
          },
        },

        vital_signs: {
          orderBy: { recorded_at: 'desc' },
          select: {
            id: true,
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
        },

        medical_records: {
          select: {
            id: true,
            treatment_plan: true,
            prescriptions: true,
            lab_request: true,
            notes: true,
            diagnoses: {
              select: {
                id: true,
                symptoms: true,
                diagnosis: true,
                notes: true,
                prescribed_medications: true,
                follow_up_plan: true,
              },
            },
          },
        },

        payments: {
          select: {
            id: true,
            total_amount: true,
            amount_paid: true,
            discount: true,
            status: true,
            payment_method: true,
            receipt_number: true,
            bill_date: true,
            bill_items: {
              select: {
                id: true,
                quantity: true,
                unit_cost: true,
                total_cost: true,
                service: {
                  select: { service_name: true },
                },
              },
            },
          },
        },
      },
    });

    // Resolve recorded_by user IDs to names for vitals
    const recordedByIds = [...new Set(
      appointments
        .flatMap(a => a.vital_signs.map(v => v.recorded_by))
        .filter(Boolean)
    )];

    const users = recordedByIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: recordedByIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()]));

    // Map to VisitResponseDto
    const visits: VisitResponseDto[] = appointments.map(apt => {
      // Vitals
      const vitals: VisitVital[] = apt.vital_signs.map(v => ({
        id: v.id,
        bodyTemperature: v.body_temperature,
        systolic: v.systolic,
        diastolic: v.diastolic,
        heartRate: v.heart_rate,
        respiratoryRate: v.respiratory_rate,
        oxygenSaturation: v.oxygen_saturation,
        weight: v.weight,
        height: v.height,
        recordedAt: v.recorded_at.toISOString(),
        recordedByName: v.recorded_by ? userMap.get(v.recorded_by) || null : null,
      }));

      // Medical records
      const medicalRecords: VisitMedicalRecord[] = apt.medical_records.map(mr => ({
        id: mr.id,
        treatmentPlan: mr.treatment_plan,
        prescriptions: mr.prescriptions,
        labRequest: mr.lab_request,
        notes: mr.notes,
        diagnoses: mr.diagnoses.map(d => ({
          id: d.id,
          symptoms: d.symptoms,
          diagnosis: d.diagnosis,
          notes: d.notes,
          prescribedMedications: d.prescribed_medications,
          followUpPlan: d.follow_up_plan,
        })),
      }));

      // Consultation
      let consultation: VisitConsultation | null = null;
      if (apt.consultation) {
        const c = apt.consultation;
        consultation = {
          id: c.id,
          chiefComplaint: c.chief_complaint,
          examination: c.examination,
          assessment: c.assessment,
          plan: c.plan,
          doctorNotes: c.doctor_notes,
          outcome: c.outcome,
          outcomeType: c.outcome_type,
          patientDecision: c.patient_decision,
          startedAt: c.started_at ? c.started_at.toISOString() : null,
          completedAt: c.completed_at ? c.completed_at.toISOString() : null,
          durationMinutes: c.duration_minutes,
        };
      }

      // Billing
      let billing: VisitBilling | null = null;
      if (apt.payments) {
        const p = apt.payments;
        const items: VisitBillingItem[] = p.bill_items.map(bi => ({
          id: bi.id,
          serviceName: bi.service?.service_name || 'Unknown',
          quantity: bi.quantity,
          unitCost: bi.unit_cost,
          totalCost: bi.total_cost,
        }));
        billing = {
          id: p.id,
          totalAmount: p.total_amount,
          amountPaid: p.amount_paid,
          discount: p.discount,
          status: p.status,
          paymentMethod: p.payment_method,
          receiptNumber: p.receipt_number,
          billDate: p.bill_date.toISOString(),
          items,
        };
      }

      return {
        id: apt.id,
        date: apt.appointment_date.toISOString(),
        time: apt.time,
        type: apt.type,
        status: apt.status,
        note: apt.note,

        doctor: apt.doctor
          ? { id: apt.doctor.id, name: apt.doctor.name, specialization: apt.doctor.specialization }
          : null,

        checkedInAt: apt.checked_in_at ? apt.checked_in_at.toISOString() : null,
        lateArrival: apt.late_arrival,
        lateByMinutes: apt.late_by_minutes,

        consultationStartedAt: apt.consultation_started_at ? apt.consultation_started_at.toISOString() : null,
        consultationEndedAt: apt.consultation_ended_at ? apt.consultation_ended_at.toISOString() : null,
        consultationDuration: apt.consultation_duration,

        consultation,
        vitals,
        medicalRecords,
        billing,
      };
    });

    return NextResponse.json({ success: true, data: visits });
  } catch (error) {
    console.error('[API] GET /api/patients/[id]/visits - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load patient visits' },
      { status: 500 }
    );
  }
}
