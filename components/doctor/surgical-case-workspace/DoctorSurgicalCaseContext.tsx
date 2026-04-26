'use client';

import React, { createContext, useContext } from 'react';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';

type InitialPlanData = {
  surgeonId: string;
  surgeonIds: string[];
  procedureDate?: Date | string | null;
  diagnosis: string;
  procedureCategory: string;
  primaryOrRevision: string;
  procedureIds: string[];
  anaesthesiaType: string;
  skinToSkinMinutes?: number | null;
  totalTheatreMinutes?: number | null;
  admissionType: string;
  assistantSurgeonIds?: string[];
  anesthesiologistUserId?: string;
  scrubNurseUserId?: string;
  circulatingNurseUserId?: string;
};

type PreopWardChecklist = {
  id: string;
  signedAt: Date | null;
  data: NursePreopWardChecklistDraft;
};

export type DoctorSurgicalCaseWorkspaceContextValue = {
  caseId: string;
  patient: unknown;
  surgicalCase: unknown;
  initialPlanData: InitialPlanData;
  anaesthesiologistName: string | null;
  preopWardChecklist: PreopWardChecklist | null;
};

const DoctorSurgicalCaseWorkspaceContext = createContext<DoctorSurgicalCaseWorkspaceContextValue | null>(
  null,
);

export function DoctorSurgicalCaseWorkspaceProvider({
  value,
  children,
}: {
  value: DoctorSurgicalCaseWorkspaceContextValue;
  children: React.ReactNode;
}) {
  return (
    <DoctorSurgicalCaseWorkspaceContext.Provider value={value}>
      {children}
    </DoctorSurgicalCaseWorkspaceContext.Provider>
  );
}

export function useDoctorSurgicalCaseWorkspace(): DoctorSurgicalCaseWorkspaceContextValue {
  const ctx = useContext(DoctorSurgicalCaseWorkspaceContext);
  if (!ctx) {
    throw new Error('useDoctorSurgicalCaseWorkspace must be used within DoctorSurgicalCaseWorkspaceProvider');
  }
  return ctx;
}

