'use client';

import { DoctorChargeSheet } from '@/components/doctor/charge-sheet/DoctorChargeSheet';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function ChargeSheetSection() {
  const { caseId } = useDoctorSurgicalCaseWorkspace();
  return <DoctorChargeSheet caseId={caseId} />;
}
