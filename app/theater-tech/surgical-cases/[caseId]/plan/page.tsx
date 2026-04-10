/**
 * Theater Tech Surgical Case Plan Page
 * 
 * Route: /theater-tech/surgical-cases/[caseId]/plan
 * 
 * Uses the same SurgicalCasePlanForm as the doctor for consistent planning.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Verify the case exists
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
    redirect('/theater-tech/consultations');
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/theater-tech/consultations" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Consultation Hub
            </Link>
          </Button>
        </div>
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Surgical Plan
          </h1>
          <p className="text-slate-500">
            Planning surgery for {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
            {surgicalCase.patient.file_number && ` (${surgicalCase.patient.file_number})`}
          </p>
        </div>
        
        {/* Surgical Case Plan Form */}
        <SurgicalCasePlanForm 
          caseId={caseId} 
          initialData={{ surgeonId: surgicalCase.primary_surgeon_id }}
        />
      </div>
    </div>
  );
}