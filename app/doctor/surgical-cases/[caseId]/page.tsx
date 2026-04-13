import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { SurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/SurgicalCaseWorkspace';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function DoctorSurgicalCaseWorkspacePage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'DOCTOR') {
    redirect('/login');
  }

  const doctor = await db.doctor.findUnique({
    where: { user_id: user.userId },
  });

  if (!doctor) {
    redirect('/unauthorized');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { id: true, name: true, specialization: true } },
      case_items: { include: { inventory_item: true } },
      case_procedures: { include: { procedure: true } },
      team_members: true,
    },
  });

  if (!surgicalCase) notFound();

  // Authorize: Doctor must be primary surgeon OR have an assigned staff invite.
  // Although /api lists cases, the view itself should be protected. We'll do a quick verify
  if (surgicalCase.primary_surgeon_id !== doctor.id) {
    const invite = await db.staffInvite.findFirst({
      where: {
        surgical_case_id: caseId,
        invited_user_id: user.userId,
      }
    });

    if (!invite) {
      redirect('/unauthorized');
    }
  }

  // Parse surgeon_ids to get the array of selected surgeons
  let selectedSurgeonIds: string[] = [];
  if (surgicalCase.surgeon_ids) {
    try {
      selectedSurgeonIds = JSON.parse(surgicalCase.surgeon_ids);
    } catch (e) {
      selectedSurgeonIds = surgicalCase.primary_surgeon_id ? [surgicalCase.primary_surgeon_id] : [];
    }
  } else if (surgicalCase.primary_surgeon_id) {
    selectedSurgeonIds = [surgicalCase.primary_surgeon_id];
  }

  const procedureIds = surgicalCase.case_procedures?.map((cp) => cp.procedure.id) || [];

  const initialPlanData = {
    surgeonId: surgicalCase.primary_surgeon_id || '',
    surgeonIds: selectedSurgeonIds,
    procedureDate: surgicalCase.procedure_date,
    diagnosis: surgicalCase.diagnosis || '',
    procedureCategory: surgicalCase.procedure_category || '',
    primaryOrRevision: surgicalCase.primary_or_revision || '',
    procedureIds: procedureIds,
    anaesthesiaType: surgicalCase.anaesthesia_type || '',
    skinToSkinMinutes: surgicalCase.skin_to_skin_minutes,
    totalTheatreMinutes: surgicalCase.total_theatre_minutes,
    admissionType: surgicalCase.admission_type || '',
    deviceUsed: surgicalCase.device_used || '',
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <SurgicalCaseWorkspace 
        patient={surgicalCase.patient} 
        surgicalCase={surgicalCase} 
        caseId={caseId} 
        initialPlanData={initialPlanData}
      />
    </div>
  );
}
