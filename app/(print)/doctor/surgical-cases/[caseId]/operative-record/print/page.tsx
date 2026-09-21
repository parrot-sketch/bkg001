/**
 * Standalone print view — Surgeon Operative Note
 * URL: /doctor/surgical-cases/[caseId]/operative-record/print
 *
 * Lives under the (print) route group so it bypasses the doctor dashboard shell.
 */

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { format, differenceInYears } from 'date-fns';

import db from '@/lib/db';
import {
  OPERATIVE_NOTE_TEMPLATE_KEY,
  OPERATIVE_NOTE_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import { AutoPrint } from '@/app/(print)/nurse/ward-prep/[id]/checklist/print/AutoPrint';
import { OperativeNotePrintToolbar } from '@/components/doctor/operative-record/OperativeNotePrintToolbar';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ autoprint?: string }>;
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function val(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  return s || '—';
}

function textBlock(htmlOrText: string | null | undefined): string {
  return stripHtml(htmlOrText) || '—';
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <div
        style={{
          width: 150,
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: '#64748b',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          borderBottom: '1px solid #e2e8f0',
          minHeight: 16,
          paddingBottom: 2,
          fontSize: 11,
          color: '#0f172a',
          whiteSpace: 'pre-wrap',
        }}
      >
        {val(value)}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid #e7d6bf',
        borderRadius: 8,
        padding: '10px 12px',
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: '#2c2e4b',
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: '1px solid #e7d6bf',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </section>
  );
}

function Narrative({ title, body }: { title: string; body: string }) {
  return (
    <section style={{ breakInside: 'avoid' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: '#2c2e4b',
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: '1px solid #e7d6bf',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.55,
          color: '#0f172a',
          whiteSpace: 'pre-wrap',
          minHeight: 48,
        }}
      >
        {body}
      </div>
    </section>
  );
}

function SignatureBlock({
  label,
  name,
  src,
}: {
  label: string;
  name: string;
  src?: string | null;
}) {
  return (
    <div style={{ textAlign: 'center', breakInside: 'avoid' }}>
      <div
        style={{
          height: 72,
          borderBottom: '1px solid #94a3b8',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={label} src={src} style={{ height: 56, maxWidth: '100%', objectFit: 'contain' }} />
        ) : null}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#2c2e4b', textTransform: 'uppercase' }}>
        {name || '—'}
      </div>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}

function fullName(u?: { first_name?: string | null; last_name?: string | null } | null) {
  return `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
}

export default async function OperativeRecordPrintPage({ params, searchParams }: Params) {
  const { caseId } = await params;
  const { autoprint } = await searchParams;

  const [surgicalCase, operative] = await Promise.all([
    db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        procedure_name: true,
        side: true,
        diagnosis: true,
        procedure_date: true,
        patient: {
          select: {
            first_name: true,
            last_name: true,
            file_number: true,
            gender: true,
            date_of_birth: true,
          },
        },
        primary_surgeon: { select: { name: true } },
        theater_booking: { select: { start_time: true } },
        staff_invites: {
          where: { status: 'ACCEPTED' },
          select: {
            invited_role: true,
            invited_user: { select: { first_name: true, last_name: true } },
          },
        },
      },
    }),
    db.clinicalFormResponse.findUnique({
      where: {
        template_key_template_version_surgical_case_id: {
          template_key: OPERATIVE_NOTE_TEMPLATE_KEY,
          template_version: OPERATIVE_NOTE_TEMPLATE_VERSION,
          surgical_case_id: caseId,
        },
      },
      select: { data_json: true, status: true, signed_at: true },
    }),
  ]);

  if (!surgicalCase) notFound();

  if (!operative) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#2c2e4b', fontSize: 18 }}>No operative note found</h1>
        <p style={{ color: '#64748b', marginTop: 8 }}>
          The surgeon operative note for this case has not been started yet.
        </p>
      </div>
    );
  }

  let data: Record<string, any> = {};
  try {
    data = JSON.parse(operative.data_json);
  } catch {
    data = {};
  }

  const header = data.header ?? {};
  const findingsAndSteps = data.findingsAndSteps ?? {};
  const counts = data.countsConfirmation ?? {};
  const opRec = data.operativeRecord ?? {};
  const metrics = data.intraOpMetrics ?? {};
  const complications = data.complications ?? {};
  const postOpPlan = data.postOpPlan ?? {};

  const patient = surgicalCase.patient;
  const patientAge =
    patient.date_of_birth != null
      ? differenceInYears(new Date(), new Date(patient.date_of_birth))
      : null;

  const getInviteName = (role: string) =>
    fullName(
      surgicalCase.staff_invites.find((i) => i.invited_role === role)?.invited_user,
    );

  const formAssistants = Array.isArray(header.assistants)
    ? header.assistants.map((a: any) => a?.name).filter(Boolean)
    : [];
  const inviteAssistants = surgicalCase.staff_invites
    .filter((i) => i.invited_role === 'ASSISTANT_SURGEON')
    .map((i) => fullName(i.invited_user))
    .filter(Boolean);
  const assistants = formAssistants.length ? formAssistants : inviteAssistants;

  const scrubNurse = getInviteName('SCRUB_NURSE');
  const circulatingNurse = getInviteName('CIRCULATING_NURSE');
  const anesth =
    header.anesthesiologistName ||
    getInviteName('ANESTHESIOLOGIST') ||
    getInviteName('ANESTHETIST_NURSE');
  const surgeonName = header.surgeonName || surgicalCase.primary_surgeon?.name || '';

  const isFinal = operative.status === 'FINAL';
  const watermarkText =
    operative.status === 'FINAL'
      ? 'FINAL'
      : operative.status === 'AMENDMENT'
        ? 'AMENDMENT'
        : 'DRAFT';
  const today = format(new Date(), 'dd MMM yyyy, HH:mm');
  const surgeryDateSource =
    surgicalCase.procedure_date || surgicalCase.theater_booking?.start_time || null;
  const surgeryDate = surgeryDateSource
    ? format(new Date(surgeryDateSource), 'dd MMM yyyy')
    : '—';

  const anesthesiaLabel = header.anesthesiaType
    ? String(header.anesthesiaType).replace(/_/g, ' ')
    : '—';

  const countsLabel = counts.countsCorrectY
    ? 'Yes — correct'
    : counts.countsCorrectN
      ? 'No — discrepancy'
      : '—';

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#operative-note-print-root) { display: none !important; }
          #operative-note-print-root { display: block !important; }
          .no-print { display: none !important; }
        }
        .watermark {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 88px; font-weight: 900;
          color: rgba(44, 46, 75, 0.045);
          pointer-events: none; z-index: 0; white-space: nowrap;
        }
        @page { size: A4; margin: 12mm; }
      `}</style>

      {autoprint === '1' ? <AutoPrint /> : null}
      <OperativeNotePrintToolbar caseId={caseId} />
      <div className="watermark">{watermarkText}</div>

      <div
        id="operative-note-print-root"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#f7f4ef',
          overflowY: 'auto',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          fontSize: 11,
          color: '#0f172a',
        }}
      >
        <div
          style={{
            maxWidth: 794,
            margin: '0 auto',
            padding: '20px 24px 48px',
            background: '#fff',
            minHeight: '100%',
            boxShadow: '0 1px 8px rgba(44,46,75,0.08)',
          }}
        >
          {/* PAGE 1 — Case header */}
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              borderBottom: '2px solid #2c2e4b',
              paddingBottom: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Image src="/nsac.png" alt="Nairobi Sculpt" width={52} height={52} priority />
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    color: '#2c2e4b',
                    textTransform: 'uppercase',
                  }}
                >
                  Nairobi Sculpt Aesthetic Centre
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    color: '#caa26a',
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  Surgeon Operative Note
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
              <div>
                Status:{' '}
                <strong style={{ color: isFinal ? '#047857' : '#b45309' }}>{operative.status}</strong>
              </div>
              <div>Generated: {today}</div>
              {operative.signed_at ? (
                <div>Signed: {format(new Date(operative.signed_at), 'dd MMM yyyy, HH:mm')}</div>
              ) : null}
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Section title="Patient">
              <Field
                label="Name"
                value={`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
              />
              <Field label="File no." value={patient.file_number} />
              <Field
                label="Sex / Age"
                value={`${patient.gender || '—'} / ${patientAge != null ? `${patientAge} yrs` : '—'}`}
              />
              <Field label="Surgery date" value={surgeryDate} />
            </Section>

            <Section title="Procedure">
              <Field
                label="Planned"
                value={textBlock(header.procedurePlanned) !== '—'
                  ? textBlock(header.procedurePlanned)
                  : surgicalCase.procedure_name}
              />
              <Field label="Performed" value={textBlock(header.procedurePerformed)} />
              <Field label="Side" value={header.side || surgicalCase.side} />
              <Field label="Anaesthesia" value={anesthesiaLabel} />
            </Section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Section title="Surgical team">
              <Field label="Surgeon" value={surgeonName} />
              <Field label="Assistants" value={assistants.join(', ') || '—'} />
              <Field label="Anaesthesiologist" value={anesth} />
              <Field label="Scrub nurse" value={scrubNurse} />
              <Field label="Circulating" value={circulatingNurse} />
            </Section>

            <Section title="Diagnosis & prep">
              <Field label="Pre-op Dx" value={textBlock(header.diagnosisPreOp)} />
              <Field label="Operative Dx" value={textBlock(header.diagnosisPostOp)} />
              <Field
                label="Shaving"
                value={
                  header.shavingY
                    ? `Yes${header.shavingExtent ? ` — ${header.shavingExtent}` : ''}`
                    : header.shavingN
                      ? 'No'
                      : '—'
                }
              />
              <Field
                label="Skin prep"
                value={header.skinPrepY ? 'Yes' : header.skinPrepN ? 'No' : '—'}
              />
            </Section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <Narrative title="Findings" body={textBlock(findingsAndSteps.findings)} />
            <Narrative title="Operative steps" body={textBlock(findingsAndSteps.operativeSteps)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <Section title="Counts">
              <Field label="Swab / instrument" value={countsLabel} />
              {counts.countsCorrectN ? (
                <Field label="Explanation" value={textBlock(counts.countsExplanation)} />
              ) : null}
            </Section>
            <Section title="Clinical notes">
              <Field
                label="EBL (ml)"
                value={
                  typeof metrics.estimatedBloodLossMl === 'number'
                    ? metrics.estimatedBloodLossMl
                    : '—'
                }
              />
              <Field
                label="Complications"
                value={
                  complications.complicationsOccurred === true
                    ? textBlock(complications.complicationsDetails) || 'Yes'
                    : complications.complicationsOccurred === false
                      ? 'None'
                      : '—'
                }
              />
              <Field label="Discharge to" value={postOpPlan.dischargeDestination} />
            </Section>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <SignatureBlock
              label="Surgeon signature"
              name={surgeonName || 'Surgeon'}
              src={counts.surgeonSignaturePage1Png}
            />
            <SignatureBlock
              label="Scrub nurse signature"
              name={scrubNurse || 'Scrub nurse'}
              src={counts.scrubNurseSignaturePng}
            />
          </div>

          {/* PAGE 2 */}
          <div style={{ breakBefore: 'page', paddingTop: 4 }}>
            <div
              style={{
                textAlign: 'center',
                background: '#2c2e4b',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Operation record — continued
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Narrative title="Operation record" body={textBlock(opRec.operationRecord)} />
              <Narrative
                title="Post-operative instructions"
                body={textBlock(opRec.postOperativeInstructions)}
              />
            </div>

            <div style={{ marginTop: 48, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              <SignatureBlock
                label="Surgeon / anaesthesiologist signature"
                name={[surgeonName, anesth].filter(Boolean).join(' / ') || '—'}
                src={opRec.surgeonOrAnesthesiologistSignaturePng}
              />
            </div>

            <footer
              style={{
                marginTop: 40,
                paddingTop: 10,
                borderTop: '1px solid #e7d6bf',
                fontSize: 8,
                color: '#94a3b8',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Nairobi Sculpt Aesthetic Centre · Confidential clinical record</span>
              <span>Case {surgicalCase.id.slice(0, 8)}</span>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
