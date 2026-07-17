'use client';

import { DoctorPatientsProvider } from './DoctorPatientsProvider';
import { DoctorPatientsView } from './DoctorPatientsView';

export function DoctorPatientsFeature() {
  return (
    <DoctorPatientsProvider>
      <DoctorPatientsView />
    </DoctorPatientsProvider>
  );
}
