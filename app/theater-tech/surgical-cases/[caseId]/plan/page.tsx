/**
 * Theater Tech Surgical Case Plan Page
 * 
 * Route: /theater-tech/surgical-cases/[caseId]/plan
 * 
 * Theater tech can directly plan surgical cases using the SurgicalCasePlanForm.
 * Pre-populates with existing case data if available.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechPlanPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();
  
  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  // Get case with all relevant fields for pre-populating the form
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: { 
      id: true, 
      primary_surgeon_id: true,
      surgeon_ids: true,
      procedure_date: true,
      diagnosis: true,
      procedure_category: true,
      primary_or_revision: true,
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
    redirect('/theater-tech/surgical-cases');
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

  // Pre-populate with all available case data
  const initialData = {
    surgeonId: surgicalCase.primary_surgeon_id || '',
    surgeonIds: selectedSurgeonIds,
    procedureDate: surgicalCase.procedure_date,
    diagnosis: surgicalCase.diagnosis || '',
    procedureCategory: surgicalCase.procedure_category || '',
    primaryOrRevision: surgicalCase.primary_or_revision || '',
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SurgicalCasePlanForm caseId={caseId} initialData={initialData} isTheaterTech={true} />
    </div>
  );
}