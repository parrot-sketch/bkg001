'use client';

/**
 * Patient Info Sidebar
 * 
 * Persistent patient context panel — always visible during consultation.
 */

import { motion } from 'framer-motion';
import { AlertTriangle, FileText, Heart, History, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { PatientConsultationHistoryItemDto } from '@/application/dtos/PatientConsultationHistoryDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import type { StructuredNotes } from '@/contexts/ConsultationContext';
import { ConsultationDivider } from './ui/ConsultationDivider';
import { ConsultationSection } from './ui/ConsultationSection';
import { PatientIdentity } from './sidebar/PatientIdentity';
import { ClinicalBrief } from './sidebar/ClinicalBrief';
import { AllergyWarning } from './sidebar/AllergyWarning';
import { MedicalBackground } from './sidebar/MedicalBackground';
import { PatientHistoryItem } from './sidebar/PatientHistoryItem';

interface PatientInfoSidebarProps {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  consultationHistory?: PatientConsultationHistoryItemDto[];
  photoCount?: number;
  notes?: StructuredNotes;
  isReadOnly?: boolean;
}

export function PatientInfoSidebar({
  patient,
  appointment,
  consultationHistory = [],
  photoCount = 0,
  notes,
  isReadOnly = false,
}: PatientInfoSidebarProps) {
  const age = patient.dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const primaryConcern = appointment?.note
    ? extractPrimaryConcern(appointment.note)
    : appointment?.type || 'Consultation';

  const isFirstTime = !appointment?.note && !patient?.medicalHistory;

  return (
    <div className="space-y-1 h-full selection:bg-indigo-500/10 bg-transparent">
      {/* ─── Patient Identity ─── */}
      <PatientIdentity 
        patient={patient} 
        age={age} 
        isFirstTime={isFirstTime} 
        photoCount={photoCount} 
      />

      <ConsultationDivider />

      {/* ─── Clinical Brief ─── */}
      <ConsultationSection icon={FileText} title="Clinical Brief">
        <ClinicalBrief 
          isReadOnly={isReadOnly} 
          notes={notes} 
          primaryConcern={primaryConcern} 
          reviewNotes={appointment?.reviewNotes} 
        />
      </ConsultationSection>

      {/* ─── Allergies ─── */}
      {patient.allergies && (
        <>
          <ConsultationDivider />
          <AllergyWarning allergies={patient.allergies} />
        </>
      )}

      {/* ─── Medical Background ─── */}
      {(patient?.medicalConditions || patient?.medicalHistory) && (
        <>
          <ConsultationDivider />
          <ConsultationSection icon={Heart} title="Medical Background">
            <MedicalBackground 
              conditions={patient?.medicalConditions} 
              history={patient?.medicalHistory} 
            />
          </ConsultationSection>
        </>
      )}

      {/* ─── Previous Consultations ─── */}
      {consultationHistory.length > 0 && (
        <>
          <ConsultationDivider />
          <ConsultationSection icon={History} title={`Session History (${consultationHistory.length})`}>
            <div className="space-y-3">
              {consultationHistory.slice(0, 3).map((c) => (
                <PatientHistoryItem key={c.id} consultation={c} />
              ))}
              {consultationHistory.length > 3 && (
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pt-1 ml-4">
                  +{consultationHistory.length - 3} ARCHIVED SESSIONS
                </p>
              )}
            </div>
          </ConsultationSection>
        </>
      )}

      {/* No history indicator */}
      {!patient?.allergies && !patient?.medicalConditions && !patient?.medicalHistory && (
        <>
          <ConsultationDivider />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 text-slate-400 italic text-[11px] h-12 justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No medical records on file
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function extractPrimaryConcern(note: string): string {
  const firstSentence = note.split(/[.!?]/)[0].trim();
  if (firstSentence.length > 0 && firstSentence.length < 150) {
    return firstSentence;
  }
  return note.length > 100 ? note.substring(0, 100) + '…' : note;
}

