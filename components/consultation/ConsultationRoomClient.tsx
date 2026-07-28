'use client';

import React from 'react';
import type { SessionUser } from '@/infrastructure/factories/ConsultationSessionFactory';
import type { SerializedSessionData } from '@/infrastructure/factories/ConsultationSessionFactory';
import { SessionProvider } from '@/providers/session/SessionProvider';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
import { ConsultationSessionContent } from '@/app/doctor/consultations/session/[appointmentId]/ConsultationSessionContent';

// ============================================================================
// PROPS
// ============================================================================

interface ConsultationRoomClientProps {
  initialSession: SerializedSessionData;
  user: SessionUser;
  restoredDraft: boolean;
  appointmentId: number;
}

// ============================================================================
// CLIENT SHELL
// ============================================================================

export default function ConsultationRoomClient({
  initialSession,
  user,
  restoredDraft,
  appointmentId,
}: ConsultationRoomClientProps) {
  return (
    <SessionProvider initialSession={initialSession} user={user} restoredDraft={restoredDraft}>
      <ConsultationProvider initialAppointmentId={appointmentId}>
        <ConsultationSessionContent />
      </ConsultationProvider>
    </SessionProvider>
  );
}
