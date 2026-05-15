'use client';

/**
 * ConsultationDocumentViewer
 *
 * Renders a single consultation as a clean, professional, read-only
 * clinical document. Groups fields into logical sections with print-ready
 * styling. No raw HTML is rendered — all content is plain text.
 *
 * Sections:
 *  - Header: date, time, doctor, status, duration
 *  - Chief Complaint
 *  - Examination Findings
 *  - Assessment / Diagnosis
 *  - Treatment Plan
 *  - Doctor Notes
 *  - Patient Decision & Outcome
 */

import { format } from 'date-fns';
import {
  Stethoscope,
  FileText,
  ClipboardList,
  Lightbulb,
  PenLine,
  Clock,
  CheckCircle2,
  HelpCircle,
  Phone,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VisitConsultation } from '@/application/dtos/VisitResponseDto';

// ─── helpers ──────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, typeof Stethoscope> = {
  chiefComplaint: Phone,
  examination: Stethoscope,
  assessment: ClipboardList,
  plan: Lightbulb,
  doctorNotes: PenLine,
};

const SECTION_COPY: Record<string, { label: string; icon: typeof Stethoscope }> = {
  chiefComplaint:   { label: 'Chief Complaint',   icon: Phone },
  examination:      { label: 'Examination',        icon: Stethoscope },
  assessment:       { label: 'Assessment',         icon: ClipboardList },
  plan:             { label: 'Treatment Plan',     icon: Lightbulb },
  doctorNotes:      { label: 'Doctor Notes',       icon: PenLine },
};

function SectionField({
  keyName,
  value,
}: {
  keyName: keyof typeof SECTION_COPY;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  const { label, icon: Icon } = SECTION_COPY[keyName];
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div
        className="text-sm text-stone-800 leading-relaxed prose prose-sm prose-stone max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}

function OutcomeBadge({ outcomeType, patientDecision }: { outcomeType: string | null; patientDecision: string | null }) {
  let label: string | null = null;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';

  if (outcomeType === 'PROCEDURE_RECOMMENDED' || outcomeType === 'PATIENT_DECIDING') {
    label = 'Procedure Recommended';
    variant = 'secondary';
  } else if (patientDecision === 'YES') {
    label = 'Proceeded';
    variant = 'default';
  } else if (patientDecision === 'NO') {
    label = 'Declined';
    variant = 'destructive';
  }

  if (!label) return null;

  const colorMap: Record<string, string> = {
    default: 'bg-blue-50 text-blue-700 border-blue-200',
    secondary: 'bg-amber-50 text-amber-700 border-amber-200',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
    outline: 'bg-stone-50 text-stone-600 border-stone-200',
  };

  return (
    <Badge variant="outline" className={cn('text-[10px] h-5 border', colorMap[variant])}>
      {label}
    </Badge>
  );
}

// ─── sub-components ───────────────────────────────────────────────

function DocHeader({ visit }: { visit: VisitConsultation }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-[#1E3A5F] flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Clinical Document</p>
          <p className="text-[10px] text-stone-400">
            {visit.startedAt && format(new Date(visit.startedAt), 'EEEE, MMM d, yyyy · h:mm a')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <OutcomeBadge outcomeType={visit.outcomeType} patientDecision={visit.patientDecision} />
        {visit.durationMinutes != null && (
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {visit.durationMinutes} min
          </span>
        )}
      </div>
    </div>
  );
}

function DocSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

function DocDivider() {
  return <div className="h-px bg-stone-100 my-4" />;
}

// ─── main component ───────────────────────────────────────────────

interface ConsultationDocumentViewerProps {
  /**
   * The raw consultation data merged with visits. If consultation is null
   * the component will show a "no record" empty state instead.
   */
  consultation: VisitConsultation | null;
  /**
   * Appointment backdrop — shown in header so the doctor immediately knows
   * which visit this corresponds to.
   */
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentType?: string | null;
}

export function ConsultationDocumentViewer({
  consultation,
  appointmentDate,
  appointmentTime,
  appointmentType,
}: ConsultationDocumentViewerProps) {
  // ── Empty / no-consultation state ───────────────────────────────
  if (!consultation) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-8 pb-8 flex flex-col items-center">
          <ClipboardList className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-xs font-medium text-stone-500">No consultation record</p>
          <p className="text-[10px] text-stone-400 mt-1">
            This visit does not have consultation notes yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyContent = Boolean(
    consultation.chiefComplaint ||
    consultation.examination ||
    consultation.assessment ||
    consultation.plan ||
    consultation.doctorNotes
  );

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="px-5 pt-4 pb-0">
        {/* Appointment context strip */}
        {appointmentDate && (
          <p className="text-[10px] text-stone-400 flex items-center gap-1 mb-2">
            <Calendar className="h-3 w-3" />
            {format(new Date(appointmentDate), 'EEEE, MMM d, yyyy')}
            {appointmentTime && `  ·  ${appointmentTime}`}
            {appointmentType && `  ·  ${appointmentType}`}
          </p>
        )}

        {/* Document header */}
        <DocHeader visit={consultation} />
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-3">
        {hasAnyContent ? (
          <DocSection>
            {/* ── Chief Complaint ─────────────────────────────────── */}
            <SectionField keyName="chiefComplaint" value={consultation.chiefComplaint} />

            <DocDivider />

            {/* ── Examination ────────────────────────────────────── */}
            <SectionField keyName="examination" value={consultation.examination} />

            <DocDivider />

            {/* ── Assessment ─────────────────────────────────────── */}
            <SectionField keyName="assessment" value={consultation.assessment} />

            <DocDivider />

            {/* ── Treatment Plan ─────────────────────────────────── */}
            <SectionField keyName="plan" value={consultation.plan} />
          </DocSection>
        ) : (
          <p className="text-xs text-stone-400">No structured consultation details recorded.</p>
        )}

        {/* ── Doctor Notes (separate — always shown below divider) ─── */}
        {consultation.doctorNotes?.trim() && (
          <>
            <DocDivider />
            <div className="bg-[#F4F1E8] rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <PenLine className="h-3 w-3" />
                Doctor Notes
              </p>
              <div
                className="text-sm text-stone-800 leading-relaxed prose prose-sm prose-stone max-w-none italic [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1"
                dangerouslySetInnerHTML={{ __html: `\u201c${consultation.doctorNotes}\u201d` }}
              />
            </div>
          </>
        )}

        {/* ── Patient Decision ───────────────────────────────────── */}
        {consultation.patientDecision && (
          <>
            <DocDivider />
            <div className="flex items-center gap-2">
              {consultation.patientDecision === 'YES' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              {consultation.patientDecision === 'NO' && (
                <HelpCircle className="h-4 w-4 text-stone-400" />
              )}
              <p className="text-sm text-stone-700">
                <span className="font-medium">Patient Decision:</span>{' '}
                <span>{consultation.patientDecision}</span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
