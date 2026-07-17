'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const StartConsultationDialog = dynamic(
  () => import('@/components/doctor/StartConsultationDialog').then(mod => ({
    default: mod.StartConsultationDialog,
  })),
  { ssr: false }
);

const CompleteConsultationDialog = dynamic(
  () => import('@/components/consultation/CompleteConsultationDialog').then(mod => ({
    default: mod.CompleteConsultationDialog,
  })),
  { ssr: false }
);

interface ConsultationDialogsProps {
  showStartDialog: boolean;
  showCompleteDialog: boolean;
  appointment: any;
  consultation: any;
  doctorId: string | null;
  onCloseStart: () => void;
  onStart: () => Promise<void>;
  onCloseComplete: () => void;
  onComplete: () => Promise<void>;
}

export function ConsultationDialogs({
  showStartDialog,
  showCompleteDialog,
  appointment,
  consultation,
  doctorId,
  onCloseStart,
  onStart,
  onCloseComplete,
  onComplete,
}: ConsultationDialogsProps) {
  return (
    <>
      {showStartDialog && appointment && (
        <Suspense fallback={null}>
          <StartConsultationDialog
            open={showStartDialog}
            onClose={onCloseStart}
            onSuccess={onStart}
            appointment={appointment}
            doctorId={doctorId || ''}
          />
        </Suspense>
      )}

      {showCompleteDialog && consultation && appointment && doctorId && (
        <Suspense fallback={null}>
          <CompleteConsultationDialog
            open={showCompleteDialog}
            onClose={onCloseComplete}
            onSuccess={onComplete}
            consultation={consultation}
            appointment={appointment}
            doctorId={doctorId}
          />
        </Suspense>
      )}
    </>
  );
}
