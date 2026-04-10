/**
 * Surgical Case Plan View Page
 * 
 * Route: /doctor/surgical-cases/[caseId]/view
 * 
 * Read-only view of the completed surgical case plan
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { SurgicalCasePlanView } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanView';

interface PageProps {
  params: Promise<{
    caseId: string;
  }>;
}

export default async function CasePlanViewPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) {
    redirect('/login');
  }

  const doctor = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true }
  });

  if (!doctor) {
    redirect('/unauthorized');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true,
        },
      },
      primary_surgeon: {
        select: {
          id: true,
          name: true,
          specialization: true,
        },
      },
      case_procedures: {
        include: {
          procedure: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!surgicalCase) {
    redirect('/doctor/surgical-cases');
  }

  const caseData = {
    procedureDate: surgicalCase.procedure_date?.toISOString() || null,
    patientFileNumber: surgicalCase.patient.file_number || '',
    patientName: `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`,
    surgeon: surgicalCase.primary_surgeon ? {
      id: surgicalCase.primary_surgeon.id,
      name: surgicalCase.primary_surgeon.name,
      specialization: surgicalCase.primary_surgeon.specialization,
    } : null,
    diagnosis: surgicalCase.diagnosis || '',
    procedureCategory: surgicalCase.procedure_category || '',
    primaryOrRevision: surgicalCase.primary_or_revision || '',
    procedures: surgicalCase.case_procedures.map(cp => ({
      id: cp.procedure.id,
      name: cp.procedure.name,
      category: cp.procedure.category,
    })),
    anaesthesiaType: surgicalCase.anaesthesia_type || '',
    skinToSkinMinutes: surgicalCase.skin_to_skin_minutes,
    totalTheatreMinutes: surgicalCase.total_theatre_minutes,
    admissionType: surgicalCase.admission_type || '',
    deviceUsed: surgicalCase.device_used,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SurgicalCasePlanView caseId={caseId} initialData={caseData} />
    </div>
  );
}