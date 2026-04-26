import { redirect, notFound } from 'next/navigation';
import { ClinicalFormStatus } from '@prisma/client';

import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { DoctorSurgicalCaseShell } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseShell';
import {
  TEMPLATE_KEY,
  normalizeLegacyChecklistData,
  type NursePreopWardChecklistDraft,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ caseId: string }>;
}

export default async function DoctorSurgicalCaseWorkspaceLayout({ children, params }: LayoutProps) {
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
      staff_invites: {
        select: {
          status: true,
          invited_role: true,
          invited_user_id: true,
          invited_user: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });

  if (!surgicalCase) notFound();

  // Authorize: Doctor must be primary surgeon OR have an assigned staff invite.
  if (surgicalCase.primary_surgeon_id !== doctor.id) {
    const invite = await db.staffInvite.findFirst({
      where: { surgical_case_id: caseId, invited_user_id: user.userId },
    });
    if (!invite) redirect('/unauthorized');
  }

  // Parse surgeon_ids from JSON string
  let selectedSurgeonIds: string[] = [];
  if (surgicalCase.surgeon_ids) {
    try {
      selectedSurgeonIds = JSON.parse(surgicalCase.surgeon_ids);
    } catch {
      selectedSurgeonIds = surgicalCase.primary_surgeon_id ? [surgicalCase.primary_surgeon_id] : [];
    }
  } else if (surgicalCase.primary_surgeon_id) {
    selectedSurgeonIds = [surgicalCase.primary_surgeon_id];
  }

  const procedureIds = surgicalCase.case_procedures?.map((cp) => String(cp.procedure.id)) || [];

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
  };

  const getAnaesthesiologistName = () => {
    type StaffInviteLite = {
      status: string;
      invited_role: string;
      invited_user: { first_name: string | null; last_name: string | null } | null;
    };
    const invites = (surgicalCase.staff_invites ?? []) as StaffInviteLite[];
    const matchesRole = (i: StaffInviteLite) =>
      i.invited_role === 'ANESTHESIOLOGIST' || i.invited_role === 'ANESTHETIST_NURSE';
    const ana = invites.find((i) => matchesRole(i) && i.status === 'ACCEPTED') ?? invites.find((i) => matchesRole(i));
    if (!ana) return null;
    const name = ana.invited_user
      ? `${ana.invited_user.first_name || ''} ${ana.invited_user.last_name || ''}`.trim()
      : '';
    return name || null;
  };

  const finalizedPreop = await db.clinicalFormResponse.findFirst({
    where: { surgical_case_id: caseId, template_key: TEMPLATE_KEY, status: ClinicalFormStatus.FINAL },
    orderBy: { updated_at: 'desc' },
  });

  let preopWardChecklist: { id: string; signedAt: Date | null; data: NursePreopWardChecklistDraft } | null =
    null;
  if (finalizedPreop) {
    let raw: unknown = {};
    try {
      raw = JSON.parse(finalizedPreop.data_json);
    } catch {
      raw = {};
    }
    preopWardChecklist = {
      id: finalizedPreop.id,
      signedAt: finalizedPreop.signed_at,
      data: normalizeLegacyChecklistData(raw),
    };
  }

  return (
    <DoctorSurgicalCaseShell
      value={{
        caseId,
        patient: surgicalCase.patient,
        surgicalCase,
        initialPlanData,
        preopWardChecklist,
        anaesthesiologistName: getAnaesthesiologistName(),
      }}
    >
      {children}
    </DoctorSurgicalCaseShell>
  );
}
