'use client';

/**
 * Doctor view of the nurse pre-op ward checklist — read-only clinical document.
 * Brand first, minimal chrome, no instructional titles.
 */

import Image from 'next/image';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';
import { cn } from '@/lib/utils';

function yn(v: boolean | undefined): 'Y' | 'N' | '—' {
  if (v === true) return 'Y';
  if (v === false) return 'N';
  return '—';
}

function text(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

function Mark({ value }: { value: boolean | undefined }) {
  const t = yn(value);
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1.5 text-xs font-bold',
        t === 'Y' && 'bg-emerald-50 text-emerald-800',
        t === 'N' && 'bg-slate-100 text-slate-600',
        t === '—' && 'bg-slate-50 text-slate-400',
      )}
    >
      {t}
    </span>
  );
}

function Cell({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0',
        accent && 'bg-rose-50/60 -mx-2 px-2 rounded-md border-b-0',
      )}
    >
      <span
        className={cn(
          'text-[11px] font-medium text-slate-500',
          accent && 'font-bold text-rose-800',
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          'max-w-[60%] text-right text-sm text-[#2c2e4b]',
          accent && 'font-bold text-rose-800',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e7d6bf]/80 bg-white px-3.5 py-2.5">
      {children}
    </div>
  );
}

function doctorName(name: string | null | undefined): string {
  if (!name) return '—';
  return /^(Dr\.?|Dr\s)/i.test(name) ? name : `Dr. ${name}`;
}

export function PreopWardChecklistViewer(props: {
  caseId: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string;
    date_of_birth?: string | Date | null;
    gender?: string | null;
  };
  surgeonName?: string | null;
  anaesthesiologistName?: string | null;
  signedAt?: Date | string | null;
  data: NursePreopWardChecklistDraft;
}) {
  const { caseId, patient, surgeonName, anaesthesiologistName, signedAt, data } = props;

  const doc = data.documentation ?? {};
  const labs = data.bloodResults ?? {};
  const meds = data.medications ?? {};
  const allerg = data.allergiesNpo ?? {};
  const prep = data.preparation ?? {};
  const pros = data.prosthetics ?? {};
  const vit = data.vitals ?? {};
  const hand = data.handover ?? {};

  const patientName = `${patient.first_name} ${patient.last_name}`.trim();
  const age = getAgeYears(patient.date_of_birth ?? null);
  const sex = formatSex(patient.gender ?? null);

  const bp =
    vit.bpSystolic != null && vit.bpDiastolic != null
      ? `${vit.bpSystolic}/${vit.bpDiastolic}`
      : '—';

  return (
    <div className="space-y-3 pb-8">
      <div className="flex justify-end print:hidden">
        <a
          href={`/doctor/surgical-cases/${caseId}/preop-ward-checklist/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-[#caa26a] hover:text-[#2c2e4b]"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </a>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e7d6bf] bg-white shadow-sm">
        {/* Brand header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#2c2e4b] bg-[#f7f4ef]/50 px-5 py-4 md:px-7">
          <div className="flex items-center gap-3">
            <Image src="/nsac.png" alt="" width={44} height={44} className="rounded-md" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2c2e4b]">
                Nairobi Sculpt Aesthetic Centre
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#caa26a]">
                Pre-operative ward checklist
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] leading-relaxed text-slate-500">
            <p>
              <span
                className={cn(
                  'font-semibold',
                  signedAt ? 'text-emerald-700' : 'text-amber-700',
                )}
              >
                {signedAt ? 'Final' : 'Draft'}
              </span>
              {' · '}Nurse document
            </p>
            {signedAt ? (
              <p>Signed {format(new Date(signedAt), 'dd MMM yyyy, HH:mm')}</p>
            ) : null}
          </div>
        </header>

        <div className="space-y-4 px-5 py-5 md:px-7 md:py-6">
          {/* Identity strip */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-[#2c2e4b] px-4 py-3 text-white sm:grid-cols-4">
            <Meta label="Patient" value={patientName || '—'} />
            <Meta label="File" value={patient.file_number || '—'} />
            <Meta
              label="Sex / Age"
              value={`${sex}${age && age !== '—' ? ` · ${age}y` : ''}`}
            />
            <Meta label="Surgeon" value={doctorName(surgeonName)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Block>
              <Cell label="Ward checklist">
                <Mark value={doc.wardChecklist} />
              </Cell>
              <Cell label="Documentation complete">
                <Mark value={doc.documentationComplete} />
              </Cell>
              <Cell label="Correct consent">
                <Mark value={doc.correctConsent} />
              </Cell>
            </Block>

            <Block>
              <Cell label="Blood / results checked">
                <Mark value={labs.bloodResultsChecked} />
              </Cell>
              <Cell label="Hb">{text((labs as { hb?: unknown }).hb)}</Cell>
              <Cell label="UECs">{text(labs.uecs)}</Cell>
              <Cell label="X-match units">{text(labs.xMatchUnitsAvailable)}</Cell>
            </Block>

            <Block>
              <Cell label="Pre-med given">
                <Mark value={meds.preMedGiven as boolean | undefined} />
              </Cell>
              <Cell label="Pre-med time">{text(meds.preMedTimeGiven)}</Cell>
              <Cell label="Pre-med details">{text(meds.preMedicationText)}</Cell>
              <Cell label="Peri-op meds">
                <Mark value={meds.periOpMedsGiven as boolean | undefined} />
              </Cell>
              <Cell label="Peri-op time">
                {text((meds as { periOpMedsTimeGiven?: unknown }).periOpMedsTimeGiven)}
              </Cell>
              <Cell label="Peri-op details">{text(meds.periOpMedicationText)}</Cell>
              <Cell label="Regular meds">{text(meds.regularMedicationText)}</Cell>
            </Block>

            <Block>
              <Cell label="Allergies documented">
                <Mark value={allerg.allergiesDocumented} />
              </Cell>
              <Cell label="Allergies" accent>
                {text(allerg.allergiesDetails)}
              </Cell>
              <Cell label="NPO">
                <Mark value={allerg.npoStatus} />
              </Cell>
              <Cell label="Fasted from">{text(allerg.npoFastedFromTime)}</Cell>
            </Block>

            <Block>
              <Cell label="Bath / gown">
                <Mark value={prep.bathGown} />
              </Cell>
              <Cell label="Shave / skin prep">
                <Mark value={prep.shaveSkinPrep} />
              </Cell>
              <Cell label="ID band">
                <Mark value={prep.idBandOn} />
              </Cell>
              <Cell label="Positioned on canvas">
                <Mark value={prep.correctPositioning} />
              </Cell>
              <Cell label="Jewellery removed">
                <Mark value={prep.jewelryRemoved} />
              </Cell>
              <Cell label="Make-up / nail varnish">
                <Mark value={prep.makeupNailPolishRemoved} />
              </Cell>
            </Block>

            <Block>
              <Cell label="Contact lenses">
                <Mark value={pros.contactLensRemoved} />
              </Cell>
              <Cell label="Hearing aid / limbs">
                <Mark value={pros.limbsProsthesisNoted} />
              </Cell>
              <Cell label="Caps / crowns / bridge">
                <Mark value={pros.crownsBridgeworkNoted} />
              </Cell>
              <Cell label="Dentures removed">
                <Mark value={pros.denturesRemoved} />
              </Cell>
            </Block>
          </div>

          <Block>
            <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
              <Cell label="BP">{bp === '—' ? bp : `${bp} mmHg`}</Cell>
              <Cell label="Pulse">{vit.pulse != null ? `${vit.pulse} bpm` : '—'}</Cell>
              <Cell label="RR">
                {vit.respiratoryRate != null ? `${vit.respiratoryRate} /min` : '—'}
              </Cell>
              <Cell label="Temp">
                {vit.temperature != null ? `${vit.temperature} °C` : '—'}
              </Cell>
              <Cell label="CVP">{text(vit.cvp)}</Cell>
              <Cell label="Bladder emptied">
                <Mark value={vit.bladderEmptied} />
              </Cell>
              <Cell label="FHR">
                {vit.foetalHeartRate != null ? `${vit.foetalHeartRate} bpm` : '—'}
              </Cell>
              <Cell label="Other">{text(vit.otherFormsRequired)}</Cell>
            </div>
          </Block>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Block>
              <Cell label="Prepared by">{text(hand.preparedByName)}</Cell>
              <Cell label="Arrived theatre">{text(hand.timeArrivedInTheatre)}</Cell>
              <Cell label="Received by">{text(hand.receivedByName)}</Cell>
              <Cell label="Handed over by">{text(hand.handedOverByName)}</Cell>
              {anaesthesiologistName ? (
                <Cell label="Anaesthesiologist">{doctorName(anaesthesiologistName)}</Cell>
              ) : null}
            </Block>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Prepared', sig: hand.preparedBySignature?.signatureDataUrl },
                  { label: 'Received', sig: hand.receivedBySignature?.signatureDataUrl },
                  { label: 'Handover', sig: hand.handedOverBySignature?.signatureDataUrl },
                ] as const
              ).map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-2"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {s.label}
                  </p>
                  <div className="mt-1 flex h-14 items-center justify-center overflow-hidden rounded-md bg-white">
                    {s.sig ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.sig}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
