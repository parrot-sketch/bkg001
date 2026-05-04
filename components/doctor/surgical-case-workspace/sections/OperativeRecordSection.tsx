'use client';

import { OperativeRecordEditor } from '@/components/doctor/operative-record/OperativeRecordEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function OperativeRecordSection() {
  const { caseId, surgicalCase, initialPlanData } = useDoctorSurgicalCaseWorkspace();
  
  // Extract procedure names from the case_procedures array mapped in the layout
  const caseProcedures = (surgicalCase as any)?.case_procedures || [];
  const procedureNames = caseProcedures.map((cp: any) => cp.procedure.name).join(', ');

  return <OperativeRecordEditor caseId={caseId} caseProcedureNames={procedureNames} initialDiagnosis={initialPlanData?.diagnosis} />;
}

