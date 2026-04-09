/**
 * Simplified Surgical Case Plan Page
 * 
 * Route: /doctor/surgical-cases/[caseId]/plan
 * 
 * This is the new simplified 2-page form replacing the complex SurgicalPlanShell.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';

interface PageProps {
  params: Promise<{
    caseId: string;
  }>;
}

export default async function SimplifiedSurgicalPlanPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) {
    redirect('/login');
  }

  // Get doctor record
  const doctor = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true, name: true }
  });

  if (!doctor) {
    redirect('/unauthorized');
  }

  // Verify the doctor has access to this case
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: { 
      id: true, 
      primary_surgeon_id: true,
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true
        }
      }
    }
  });

  if (!surgicalCase) {
    redirect('/doctor/surgical-cases');
  }

  // Only the primary surgeon can edit the plan
  if (surgicalCase.primary_surgeon_id !== doctor.id) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SurgicalCasePlanForm caseId={caseId} />
    </div>
  );
}
