'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';
import { SurgicalCasePlanView } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanView';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function CasePlanSection() {
  const router = useRouter();
  const { caseId, initialPlanData, surgicalCase } = useDoctorSurgicalCaseWorkspace();
  const [isEditing, setIsEditing] = useState(false);

  const hasInitialPlanData = useMemo(() => {
    return Boolean(
      initialPlanData?.procedureDate ||
        initialPlanData?.diagnosis ||
        (initialPlanData?.procedureIds?.length ?? 0) > 0 ||
        (initialPlanData?.surgeonIds?.length ?? 0) > 0,
    );
  }, [initialPlanData]);

  type Procedure = { id: string; name: string; category?: string | null };
  type Surgeon = { id: string; name: string };
  type SurgicalCaseShape = {
    case_procedures?: Array<{ procedure: Procedure }>;
    primary_surgeon?: Surgeon | null;
  };

  const sc = surgicalCase as SurgicalCaseShape;
  const procedures = sc.case_procedures?.map((cp) => cp.procedure) ?? [];
  const surgeons = sc.primary_surgeon ? [sc.primary_surgeon] : [];

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-start max-w-2xl mx-auto">
          {hasInitialPlanData && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plan View
            </Button>
          )}
        </div>
        <SurgicalCasePlanForm caseId={caseId} initialData={initialPlanData} isTheaterTech={false} />
      </div>
    );
  }

  return (
    <SurgicalCasePlanView
      onEdit={() => setIsEditing(true)}
      onContinue={() => router.push(`/doctor/surgical-cases/${caseId}/surgical-notes`)}
      data={initialPlanData}
      surgeons={surgeons}
      procedures={procedures}
    />
  );
}
