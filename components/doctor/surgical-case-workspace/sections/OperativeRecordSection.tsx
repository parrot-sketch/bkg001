'use client';

import { OperativeRecordEditor } from '@/components/doctor/operative-record/OperativeRecordEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function OperativeRecordSection() {
  const { caseId } = useDoctorSurgicalCaseWorkspace();
  return <OperativeRecordEditor caseId={caseId} />;
}

