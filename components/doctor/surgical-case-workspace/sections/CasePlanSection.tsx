'use client';

import { DoctorCasePlanEditor } from '@/components/doctor/surgical-case-plan/DoctorCasePlanEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function CasePlanSection() {
  const { caseId, initialPlanData } = useDoctorSurgicalCaseWorkspace();

  return <DoctorCasePlanEditor caseId={caseId} initialData={initialPlanData} />;
}
