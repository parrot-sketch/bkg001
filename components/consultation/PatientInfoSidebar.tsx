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

  const isFirstTime = !appointment?.note && !patient.medicalHistory;

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
      {(patient.medicalConditions || patient.medicalHistory) && (
        <>
          <ConsultationDivider />
          <ConsultationSection icon={Heart} title="Medical Background">
            <MedicalBackground 
              conditions={patient.medicalConditions} 
              history={patient.medicalHistory} 
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
      {!patient.allergies && !patient.medicalConditions && !patient.medicalHistory && (
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
// SUB-COMPONENTS
// ============================================================================

function PatientIdentity({ patient, age, isFirstTime, photoCount }: {
  patient: any;
  age: number | null;
  isFirstTime: boolean;
  photoCount: number;
}) {
  return (
    <div className="p-5 pb-4">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm"
        >
          <span className="text-base font-bold text-indigo-600">
            {patient.firstName?.[0]}{patient.lastName?.[0]}
          </span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-900 truncate tracking-tight">
            {patient.firstName} {patient.lastName}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
            {age !== null && <span className="text-slate-700 font-bold">{age}Y</span>}
            {age !== null && patient.gender && <span className="opacity-30">•</span>}
            {patient.gender && <span className="uppercase tracking-wider text-[10px] font-bold text-slate-600">{patient.gender.toLowerCase()}</span>}
            {patient.fileNumber && (
              <>
                <span className="opacity-30">•</span>
                <span className="font-mono text-[10px] text-slate-500">{patient.fileNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {isFirstTime && (
          <Badge variant="outline" className="text-[10px] h-5 bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-2">
            NEW PATIENT
          </Badge>
        )}
        {photoCount > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 gap-1.5 border-slate-200 text-slate-600 font-bold px-2 bg-slate-50">
            <Camera className="h-2.5 w-2.5 opacity-70" />
            {photoCount} PHOTOS
          </Badge>
        )}
        {patient.allergies && (
          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-100 gap-1.5 font-bold px-2">
            <AlertTriangle className="h-2.5 w-2.5" />
            ALLERGIES
          </Badge>
        )}
      </div>
    </div>
  );
}

function ClinicalBrief({ isReadOnly, notes, primaryConcern, reviewNotes }: {
  isReadOnly: boolean;
  notes?: StructuredNotes;
  primaryConcern: string;
  reviewNotes?: string | null;
}) {
  return (
    <>
      {isReadOnly && notes && (Object.keys(notes).length > 0) ? (
        <div className="space-y-2.5">
          {Object.entries(notes).map(([key, value]) => value && (
            <div key={key} className="bg-white/40 border border-slate-200/50 rounded-lg p-2.5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <div
                className="text-[11px] text-slate-700 leading-relaxed line-clamp-3 prose-p:my-0"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          {primaryConcern}
        </div>
      )}
      {reviewNotes && (
        <div className="mt-3 text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
          <span className="font-bold text-[10px] uppercase tracking-wider block mb-1 text-amber-600">Nurse Annotation</span>
          {reviewNotes}
        </div>
      )}
    </>
  );
}

function AllergyWarning({ allergies }: { allergies: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-2.5 bg-red-50/50 border border-red-100 rounded-xl px-3.5 py-3 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-widest">Critical Allergies</p>
          <p className="text-xs text-red-900/80 mt-1 leading-relaxed">{allergies}</p>
        </div>
      </div>
    </div>
  );
}

function MedicalBackground({ conditions, history }: { conditions?: string | null; history?: string | null }) {
  return (
    <div className="space-y-3">
      {conditions && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Conditions</p>
          <p className="text-xs text-slate-700 leading-relaxed">{conditions}</p>
        </div>
      )}
      {history && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">History</p>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{history}</p>
        </div>
      )}
    </div>
  );
}

function PatientHistoryItem({ consultation }: { consultation: PatientConsultationHistoryItemDto }) {
  return (
    <motion.div
      whileHover={{ x: 2, scale: 1.01 }}
      className="group flex items-start gap-4 bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-default"
    >
      <div className="mt-1.5 h-2 w-2 rounded-lg bg-slate-300 group-hover:bg-indigo-500 shrink-0 transition-all" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-bold text-slate-900 tracking-tight">
            {format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}
          </span>
          {consultation.outcomeType && (
            <Badge variant="outline" className="text-[9px] h-4.5 px-2 font-bold border-indigo-100 bg-indigo-50 text-indigo-600 uppercase tracking-wider">
              {consultation.outcomeType === 'PROCEDURE_RECOMMENDED' ? 'Procedure' : 'Consult'}
            </Badge>
          )}
        </div>
        {consultation.notesSummary && (
          <p className="text-[11px] text-slate-500 group-hover:text-slate-600 line-clamp-2 leading-relaxed transition-colors">
            {consultation.notesSummary}
          </p>
        )}
      </div>
    </motion.div>
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
