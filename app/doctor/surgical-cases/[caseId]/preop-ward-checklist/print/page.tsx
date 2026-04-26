import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function DoctorPreopWardChecklistPrintRedirectPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'DOCTOR') {
    redirect('/login');
  }

  const doctor = await db.doctor.findUnique({
    where: { user_id: user.userId },
    select: { id: true },
  });
  if (!doctor) {
    redirect('/unauthorized');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: { primary_surgeon_id: true },
  });
  if (!surgicalCase) {
    redirect('/doctor/surgical-cases');
  }

  if (surgicalCase.primary_surgeon_id !== doctor.id) {
    const invite = await db.staffInvite.findFirst({
      where: { surgical_case_id: caseId, invited_user_id: user.userId },
      select: { id: true },
    });
    if (!invite) {
      redirect('/unauthorized');
    }
  }

  // Reuse the canonical print view for the nurse pre-op checklist.
  redirect(`/nurse/ward-prep/${caseId}/checklist/print?autoprint=1`);
}

