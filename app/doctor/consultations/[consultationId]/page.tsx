import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ConsultationDetailPageContent from './ConsultationDetailPageContent';

interface ConsultationDetailPageProps {
  params: Promise<{
    consultationId: string;
  }>;
}

async function getConsultationRecord(consultationId: number, doctorId: string) {
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
      surgical_case: { 
        select: { 
          id: true,
          procedure_date: true,
          diagnosis: true,
          procedure_category: true,
          primary_or_revision: true,
          anaesthesia_type: true,
          case_procedures: { select: { id: true } }
        } 
      },
    },
  });

  if (!consultation || consultation.doctor_id !== doctorId) {
    return null;
  }

  const payment = await db.payment.findFirst({
    where: { appointment_id: consultation.appointment_id },
    include: {
      bill_items: {
        include: { service: true },
      },
    },
  });

  const patient = consultation.appointment.patient;
  
  const hasStructuredNotes = consultation.chief_complaint || consultation.examination || consultation.plan;
  const fallbackNotes = consultation.doctor_notes || '';
  
  let chiefComplaint = consultation.chief_complaint || '';
  let examination = consultation.examination || '';
  let plan = consultation.plan || '';
  
  if (!hasStructuredNotes && fallbackNotes) {
    const chiefMatch = fallbackNotes.match(/Chief Complaint:([\s\S]*?)(?:Examination:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const examMatch = fallbackNotes.match(/Examination:([\s\S]*?)(?:Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const planMatch = fallbackNotes.match(/Plan:([\s\S]*?)(?:=== CONSULTATION OUTCOME ===|$)/i);
    
    if (chiefMatch) chiefComplaint = chiefMatch[1].trim();
    if (examMatch) examination = examMatch[1].trim();
    if (planMatch) plan = planMatch[1].trim();
  }
  
  const data = {
    id: consultation.id,
    appointmentId: consultation.appointment_id,
    chiefComplaint,
    examination,
    plan,
    outcomeType: consultation.outcome_type ?? undefined,
    completedAt: consultation.completed_at?.toISOString() ?? undefined,
    durationMinutes: consultation.duration_minutes ?? undefined,
    surgicalCaseId: consultation.surgical_case?.id,
    isSurgicalPlanComplete: !!(consultation.surgical_case?.procedure_date && 
      consultation.surgical_case?.diagnosis && 
      consultation.surgical_case?.procedure_category && 
      consultation.surgical_case?.primary_or_revision && 
      consultation.surgical_case?.anaesthesia_type &&
      consultation.surgical_case?.case_procedures?.length > 0),
    appointment: {
      id: consultation.appointment.id,
      type: consultation.appointment.type,
      appointmentDate: consultation.appointment.appointment_date.toISOString(),
      time: consultation.appointment.time,
      status: consultation.appointment.status,
      patient: {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        fileNumber: patient.file_number,
        dateOfBirth: patient.date_of_birth?.toISOString(),
        gender: patient.gender,
        phone: patient.phone,
      },
    },
    hasSurgicalCase: !!consultation.surgical_case,
  };

  let paymentData = null;
  if (payment) {
    const billItems = payment.bill_items.map((item: any) => ({
      id: item.id,
      serviceName: item.service?.service_name || 'Unknown Service',
      quantity: item.quantity,
      unitCost: Number(item.unit_cost),
      totalCost: Number(item.total_cost),
    }));

    paymentData = {
      id: payment.id,
      chargeSheetNo: payment.charge_sheet_no,
      totalAmount: Number(payment.total_amount),
      discount: Number(payment.discount),
      amountPaid: Number(payment.amount_paid),
      status: payment.status,
      finalizedAt: payment.finalized_at?.toISOString(),
      billItems,
    };
  }

  return { ...data, payment: paymentData };
}

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  const { consultationId: consultationIdParam } = await params;
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) {
    redirect('/login');
  }

  const doctorRecord = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true }
  });

  if (!doctorRecord) {
    redirect('/unauthorized');
  }

  const doctorId = doctorRecord.id;
  const consultationId = parseInt(consultationIdParam);
  
  if (isNaN(consultationId)) {
    notFound();
  }

  const recordData = await getConsultationRecord(consultationId, doctorId);

  if (!recordData) {
    notFound();
  }

  return <ConsultationDetailPageContent recordData={recordData} />;
}
