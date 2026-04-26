'use client';

import { ChargeSheetStep } from '@/components/theater-tech/ChargeSheetStep';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function ChargeSheetSection() {
  const { caseId } = useDoctorSurgicalCaseWorkspace();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-slate-900">Charge Sheet</h2>
        <p className="text-sm text-slate-500 mt-0.5">Services and inventory items captured against this surgical case</p>
      </div>
      <ChargeSheetStep caseId={caseId} />
    </div>
  );
}

