'use client';

/**
 * ConsultationDocumentViewer
 *
 * Renders a single consultation as a clean, professional, read-only
 * clinical document. Groups fields into logical sections with print-ready
 * styling. No raw HTML is rendered — all content is plain text.
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
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#2c2e4b]/40 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#2c2e4b]/60" />
        {label}
      </p>
      <div
        className="text-xs text-[#2c2e4b] leading-relaxed prose prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1"
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
    default: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    secondary: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    destructive: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    outline: 'bg-white/10 text-white/70 border-white/15',
  };

  return (
    <Badge variant="outline" className={cn('text-[9px] h-5 border rounded-md px-1.5 font-bold', colorMap[variant])}>
      {label}
    </Badge>
  );
}

// ─── sub-components ───────────────────────────────────────────────

function DocHeader({ visit }: { visit: VisitConsultation }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-[#2c2e4b] flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#2c2e4b]">Clinical Document</p>
          <p className="text-[10px] text-[#2c2e4b]/40 font-mono mt-0.5">
            {visit.startedAt && format(new Date(visit.startedAt), 'EEEE, MMM d, yyyy · h:mm a')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <OutcomeBadge outcomeType={visit.outcomeType} patientDecision={visit.patientDecision} />
        {visit.durationMinutes != null && (
          <span className="text-[10px] text-[#2c2e4b]/40 font-mono flex items-center gap-1">
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
  return <div className="h-px bg-[#e7d6bf]/30 my-4" />;
}

// ─── main component ───────────────────────────────────────────────

interface ConsultationDocumentViewerProps {
  consultation: VisitConsultation | null;
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
  if (!consultation) {
    return (
      <Card className="border-dashed border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardContent className="pt-8 pb-8 flex flex-col items-center">
          <ClipboardList className="h-8 w-8 text-[#e7d6bf] mb-3" />
          <p className="text-xs font-semibold text-[#2c2e4b]">No consultation record</p>
          <p className="text-[10px] text-[#2c2e4b]/40 mt-1">
            This visit does not have consultation notes yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasStructured = Boolean(
    consultation.chiefComplaint ||
    consultation.examination ||
    consultation.assessment ||
    consultation.plan
  );
  const legacyNotes = consultation.doctorNotes?.trim() || '';

  return (
    <Card className="border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-4 pb-0">
        {/* Appointment context strip */}
        {appointmentDate && (
          <p className="text-[9px] text-[#2c2e4b]/40 font-semibold uppercase tracking-wider flex items-center gap-1 mb-2">
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
        {hasStructured ? (
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
        ) : legacyNotes ? (
          /* Legacy fallback — only shown when no structured SOAP exists */
          <div className="bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-xl px-4 py-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#2c2e4b]/40 flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-[#2c2e4b]/60" />
              Doctor Notes
            </p>
            <div
              className="text-xs text-[#2c2e4b] leading-relaxed prose prose-sm max-w-none italic [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1"
              dangerouslySetInnerHTML={{ __html: `\u201c${legacyNotes}\u201d` }}
            />
          </div>
        ) : (
          <p className="text-xs text-[#2c2e4b]/40">No consultation details recorded.</p>
        )}

        {/* ── Patient Decision ───────────────────────────────────── */}
        {consultation.patientDecision && (
          <>
            <DocDivider />
            <div className="flex items-center gap-2">
              {consultation.patientDecision === 'YES' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <HelpCircle className="h-4 w-4 text-[#2c2e4b]/40" />
              )}
              <p className="text-xs text-[#2c2e4b]">
                <span className="font-semibold">Patient Decision:</span>{' '}
                <span className="font-medium text-[#2c2e4b]/80">{consultation.patientDecision}</span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
