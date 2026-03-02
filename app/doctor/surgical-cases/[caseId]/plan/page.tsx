/**
 * Surgical Case Plan Page
 * 
 * Route: /doctor/surgical-cases/[caseId]/plan
 * 
 * Minimal page component that delegates to SurgicalPlanShell.
 * All business logic is in the feature module.
 */

'use client';

import { useParams } from 'next/navigation';
import { SurgicalPlanShell } from '@/features/surgical-plan';

export default function CasePlanPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  if (!caseId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Invalid case ID</p>
      </div>
    );
  }

  return <SurgicalPlanShell caseId={caseId} />;
}
