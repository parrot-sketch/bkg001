import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ConsultationEditPageContent from './ConsultationEditPageContent';

interface ConsultationEditPageProps {
  params: Promise<{
    consultationId: string;
  }>;
}

async function getConsultationForEdit(consultationId: number, doctorId: string) {
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
      surgical_case: {
        select: { id: true },
      },
    },
  });

  if (!consultation || consultation.doctor_id !== doctorId) {
    return null;
  }

  const patient = consultation.appointment.patient;
  
  // Check if we have structured notes, otherwise parse from doctor_notes
  const hasStructuredNotes = consultation.chief_complaint || consultation.examination || consultation.assessment || consultation.plan;
  const fallbackNotes = consultation.doctor_notes || '';

  let chiefComplaint = consultation.chief_complaint || '';
  let examination = consultation.examination || '';
  let assessment = consultation.assessment || '';
  let plan = consultation.plan || '';

  // Parse legacy raw notes if structured fields are empty
  if (!hasStructuredNotes && fallbackNotes) {
    const chiefMatch = fallbackNotes.match(/Chief Complaint:([\s\S]*?)(?:Examination:|Assessment:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const examMatch = fallbackNotes.match(/Examination:([\s\S]*?)(?:Assessment:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const assessmentMatch = fallbackNotes.match(/Assessment:([\s\S]*?)(?:Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const planMatch = fallbackNotes.match(/Plan:([\s\S]*?)(?:=== CONSULTATION OUTCOME ===|$)/i);
    
    if (chiefMatch) chiefComplaint = chiefMatch[1].trim();
    if (examMatch) examination = examMatch[1].trim();
    if (assessmentMatch) assessment = assessmentMatch[1].trim();
    if (planMatch) plan = planMatch[1].trim();
  }

  return {
    id: consultation.id,
    appointmentId: consultation.appointment_id,
    chiefComplaint,
    examination,
    assessment,
    plan,
    outcomeType: consultation.outcome_type ?? undefined,
    completedAt: consultation.completed_at?.toISOString() ?? undefined,
    appointment: {
      id: consultation.appointment.id,
      type: consultation.appointment.type,
      appointmentDate: consultation.appointment.appointment_date.toISOString(),
      status: consultation.appointment.status,
      patient: {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        fileNumber: patient.file_number,
      },
    },
    hasSurgicalCase: !!consultation.surgical_case,
  };
}

interface ConsultationEditPageContentProps {
  recordData: ConsultationRecord;
  doctorId: string;
}

export default async function ConsultationEditPage({ params }: ConsultationEditPageProps) {
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

  const consultationId = parseInt(consultationIdParam);

  if (isNaN(consultationId)) {
    notFound();
  }

  const recordData = await getConsultationForEdit(consultationId, doctorRecord.id);

  if (!recordData) {
    notFound();
  }

  return <ConsultationEditPageContent recordData={recordData} doctorId={doctorRecord.id} />;
}