/**
 * Theater Tech Surgical Case Summary (Print)
 *
 * Route: /theater-tech/surgical-cases/[caseId]/print
 *
 * Print-first version of the document-style case summary.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { TheaterTechCaseDetailView } from '@/components/theater-tech/surgical-case-details/TheaterTechCaseDetailView';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechCasePrintPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
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
        where: { status: 'ACCEPTED' },
        include: { invited_user: { select: { first_name: true, last_name: true, role: true } } },
      },
    },
  });

  if (!surgicalCase) notFound();

  const procedureNames = surgicalCase.case_procedures.map((cp) => cp.procedure.name);

  const primarySurgeon = surgicalCase.primary_surgeon
    ? [{ id: surgicalCase.primary_surgeon.id, name: surgicalCase.primary_surgeon.name, specialization: surgicalCase.primary_surgeon.specialization }]
    : [];

  let assistantSurgeons: Array<{ id: string; name: string; specialization?: string | null }> = [];
  if (surgicalCase.surgeon_ids && surgicalCase.primary_surgeon_id) {
    try {
      const ids = JSON.parse(surgicalCase.surgeon_ids);
      if (Array.isArray(ids)) {
        const assistantIds = ids.filter((id: string) => id && id !== surgicalCase.primary_surgeon_id);
        if (assistantIds.length > 0) {
          assistantSurgeons = await db.doctor.findMany({
            where: { id: { in: assistantIds } },
            select: { id: true, name: true, specialization: true },
          });
        }
      }
    } catch {
      // Ignore malformed surgeon_ids
    }
  }

  return (
    <TheaterTechCaseDetailView
      caseId={caseId}
      surgicalCase={surgicalCase}
      surgeons={primarySurgeon}
      assistantSurgeons={assistantSurgeons}
      procedureNames={procedureNames}
      variant="print"
    />
  );
}

