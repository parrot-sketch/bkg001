'use client';

import { OperativeRecordEditor } from '@/components/doctor/operative-record/OperativeRecordEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function OperativeRecordSection() {
  const { caseId, surgicalCase, initialPlanData } = useDoctorSurgicalCaseWorkspace();

  const caseProcedures = (surgicalCase as { case_procedures?: Array<{ procedure: { name: string } }> })
    ?.case_procedures || [];
  const procedureNames = caseProcedures.map((cp) => cp.procedure.name).join(', ');

  return (
    <OperativeRecordEditor
      caseId={caseId}
      caseProcedureNames={procedureNames}
      initialDiagnosis={initialPlanData?.diagnosis}
    />
  );
}
