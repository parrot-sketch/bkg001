'use client';

/**
 * Patient Info Sidebar
 * 
 * Persistent patient context panel — always visible during consultation.
 * Premium clinical design with clear information hierarchy:
 * 
 * 1. Patient identity (name, age, gender, file #)
 * 2. Clinical brief (primary concern, assistant notes)
 * 3. Allergies (prominent warning if exists)
 * 4. Medical conditions & history
 * 5. Previous consultations (compact timeline)
 */

import { AlertTriangle, User, FileText, Heart, History, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { PatientConsultationHistoryItemDto } from '@/application/dtos/PatientConsultationHistoryDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface PatientInfoSidebarProps {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  consultationHistory?: PatientConsultationHistoryItemDto[];
  photoCount?: number;
  onViewFullProfile?: () => void;
  onViewCasePlans?: () => void;
  onViewPhotos?: () => void;
}

export function PatientInfoSidebar({
  patient,
  appointment,
  consultationHistory = [],
  photoCount = 0,
}: PatientInfoSidebarProps) {
  // Calculate age
  const age = patient.dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const primaryConcern = appointment?.note
    ? extractPrimaryConcern(appointment.note)
    : appointment?.type || 'Consultation';

  const isFirstTime = !appointment?.note && !patient.medicalHistory;

  return (
    <div className="space-y-1 overflow-y-auto">
      {/* ─── Patient Identity ─── */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-slate-600">
              {patient.firstName?.[0]}{patient.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              {age !== null && <span>{age}y</span>}
              {age !== null && patient.gender && <span className="text-slate-300">•</span>}
              {patient.gender && <span className="capitalize">{patient.gender.toLowerCase()}</span>}
              {patient.fileNumber && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-[11px]">{patient.fileNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {isFirstTime && (
            <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200">
              First Visit
            </Badge>
          )}
          {photoCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1">
              <Camera className="h-2.5 w-2.5" />
              {photoCount} photo{photoCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {patient.allergies && (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              Allergies
            </Badge>
          )}
        </div>
      </div>

      <Divider />

      {/* ─── Clinical Brief ─── */}
      <SidebarSection icon={FileText} title="Clinical Brief">
        <div className="text-xs text-slate-600 leading-relaxed">
          {primaryConcern}
        </div>
        {appointment?.reviewNotes && (
          <div className="mt-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
            <span className="font-medium">Assistant: </span>
            {appointment.reviewNotes}
          </div>
        )}
      </SidebarSection>

      {/* ─── Allergies (prominent) ─── */}
      {patient.allergies && (
        <>
          <Divider />
          <div className="px-4 py-3">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">Allergies</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{patient.allergies}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Medical Info ─── */}
      {(patient.medicalConditions || patient.medicalHistory) && (
        <>
          <Divider />
          <SidebarSection icon={Heart} title="Medical Background">
            {patient.medicalConditions && (
              <div className="mb-2">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Conditions</p>
                <p className="text-xs text-slate-600 leading-relaxed">{patient.medicalConditions}</p>
              </div>
            )}
            {patient.medicalHistory && (
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">History</p>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{patient.medicalHistory}</p>
              </div>
            )}
          </SidebarSection>
        </>
      )}

      {/* ─── Previous Consultations ─── */}
      {consultationHistory.length > 0 && (
        <>
          <Divider />
          <SidebarSection icon={History} title={`Past Consultations (${consultationHistory.length})`}>
            <div className="space-y-2">
              {consultationHistory.slice(0, 3).map((c) => (
                <ConsultationHistoryItem key={c.id} consultation={c} />
              ))}
              {consultationHistory.length > 3 && (
                <p className="text-[11px] text-slate-400 font-medium pt-1">
                  +{consultationHistory.length - 3} more
                </p>
              )}
            </div>
          </SidebarSection>
        </>
      )}

      {/* No allergies indicator (subtle) */}
      {!patient.allergies && !patient.medicalConditions && !patient.medicalHistory && (
        <>
          <Divider />
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400 italic">
              No medical history on file
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Divider() {
  return <div className="mx-4 border-t border-slate-100" />;
}

function SidebarSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ConsultationHistoryItem({
  consultation,
}: {
  consultation: PatientConsultationHistoryItemDto;
}) {
  return (
    <div className="group flex items-start gap-2.5">
      {/* Timeline dot */}
      <div className="mt-1.5 h-2 w-2 rounded-full bg-slate-200 group-first:bg-slate-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">
            {format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}
          </span>
          {consultation.outcomeType && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
              {consultation.outcomeType === 'PROCEDURE_RECOMMENDED' ? 'Procedure' : 'Consult'}
            </Badge>
          )}
        </div>
        {consultation.notesSummary && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
            {consultation.notesSummary}
          </p>
        )}
      </div>
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
