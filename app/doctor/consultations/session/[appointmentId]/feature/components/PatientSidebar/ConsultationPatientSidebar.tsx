'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const PatientInfoSidebar = dynamic(
  () => import('@/components/consultation/PatientInfoSidebar').then(mod => ({
    default: mod.PatientInfoSidebar,
  })),
  { ssr: false }
);

interface ConsultationPatientSidebarProps {
  patient: any;
  appointment: any;
  vitals: any;
}

export function ConsultationPatientSidebar({ patient, appointment, vitals }: ConsultationPatientSidebarProps) {
  return (
    <PatientInfoSidebar
      patient={patient}
      appointment={appointment}
      vitals={vitals}
    />
  );
}
