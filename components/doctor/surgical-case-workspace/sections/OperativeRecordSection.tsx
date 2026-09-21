'use client';

import { OperativeRecordEditor } from '@/components/doctor/operative-record/OperativeRecordEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function OperativeRecordSection() {
  const { caseId, surgicalCase, initialPlanData } = useDoctorSurgicalCaseWorkspace();

  const caseProcedures = (surgicalCase as { case_procedures?: Array<{ procedure: { name: string } }> })
    ?.case_procedures || [];
  const procedureNames = caseProcedures.map((cp) => cp.procedure.name).join(', ');

  return (
    <div className="space-y-4">
      <header className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#caa26a]">
          Doctor document
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2c2e4b]">
          Surgeon operative note
        </h1>
      </header>
      <OperativeRecordEditor
        caseId={caseId}
        caseProcedureNames={procedureNames}
        initialDiagnosis={initialPlanData?.diagnosis}
      />
    </div>
  );
}
