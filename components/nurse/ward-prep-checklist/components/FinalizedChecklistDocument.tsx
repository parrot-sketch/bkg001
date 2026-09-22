'use client';

import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';

import { Button } from '@/components/ui/button';
import { ArrowRight, Printer } from 'lucide-react';
import Link from 'next/link';

function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '—';
  return /^(Dr\.?|Dr\s)/i.test(name) ? name : `Dr. ${name}`;
}

function YesNo({ value }: { value: boolean | undefined }) {
  if (value === true) return <span className="font-semibold text-emerald-700">Yes</span>;
  if (value === false) return <span className="text-slate-600">No</span>;
  return <span className="text-slate-400 italic">—</span>;
}

function TextVal({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') return <span className="text-slate-400 italic">—</span>;
  return <span className="whitespace-pre-wrap">{String(value)}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 border-b border-slate-200 py-2.5 last:border-b-0">
      <div className="col-span-5 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="col-span-7 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="border-b border-slate-300 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function FinalizedChecklistDocument(props: {
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
  data: NursePreopWardChecklistDraft;
}) {
  const { caseId, patient, surgeonName, anaesthesiologistName, data } = props;

  const header = data.header ?? {};
  const doc = data.documentation ?? {};
  const labs = data.bloodResults ?? {};
  const meds = data.medications ?? {};
  const allerg = data.allergiesNpo ?? {};
  const prep = data.preparation ?? {};
  const pros = data.prosthetics ?? {};
  const vit = data.vitals ?? {};
  const hand = data.handover ?? {};

  const patientName = `${patient.first_name} ${patient.last_name}`.trim();

  return (
    <article className="overflow-hidden border border-slate-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-3 border-b border-slate-300 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8 lg:px-10 sm:py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Nairobi Sculpt Aesthetic Centre
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Pre-Operative Ward Check-List
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Finalized — next step is the Nursing Operation Record (Intra-Op)
          </p>
          <p className="mt-3 text-sm text-slate-800">
            <span className="font-semibold">{patientName}</span>
            <span className="text-slate-400"> · </span>
            <span className="font-mono text-slate-700">{patient.file_number}</span>
            <span className="text-slate-400"> · </span>
            {getAgeYears(patient.date_of_birth)} / {formatSex(patient.gender)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Surgeon: {formatDoctorName(surgeonName)}
            {anaesthesiologistName ? ` · Anaesthesiologist: ${anaesthesiologistName}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            Finalized
          </span>
          <Button asChild size="sm" className="h-8 gap-1.5 bg-[#2c2e4b] font-semibold text-white hover:bg-[#1e2038]">
            <Link href={`/nurse/intra-op-cases/${caseId}/record`}>
              Open Intra-Op Record
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <a href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-3.5 w-3.5" />
              Print
            </a>
          </Button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 lg:px-10 sm:py-8">
        {(header as { nursingComments?: string }).nursingComments ? (
          <Section title="Nursing comments / observations">
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {(header as { nursingComments?: string }).nursingComments}
            </p>
          </Section>
        ) : null}

        <Section title="1. Documentation">
          <Row label="Ward checklist"><YesNo value={doc.wardChecklist} /></Row>
          <Row label="Complete/correct documentation"><YesNo value={doc.documentationComplete} /></Row>
          <Row label="Correct consent"><YesNo value={doc.correctConsent} /></Row>
        </Section>

        <Section title="2. Blood / Results (Hb, UECs, X-Match)">
          <Row label="Blood/results checked"><YesNo value={labs.bloodResultsChecked} /></Row>
          <Row label="Hb"><TextVal value={(labs as { hb?: string }).hb} /></Row>
          <Row label="UECs"><TextVal value={labs.uecs} /></Row>
          <Row label="Units available"><TextVal value={labs.xMatchUnitsAvailable} /></Row>
        </Section>

        <Section title="3. Medication">
          <Row label="Pre-medication given"><YesNo value={meds.preMedGiven as boolean | undefined} /></Row>
          <Row label="Pre-medication time given"><TextVal value={meds.preMedTimeGiven} /></Row>
          <Row label="Pre-medication (details)"><TextVal value={meds.preMedicationText} /></Row>
          <Row label="Peri-operative medication given"><YesNo value={meds.periOpMedsGiven as boolean | undefined} /></Row>
          <Row label="Peri-operative time given"><TextVal value={(meds as { periOpMedsTimeGiven?: string }).periOpMedsTimeGiven} /></Row>
          <Row label="Peri-operative medication (details)"><TextVal value={meds.periOpMedicationText} /></Row>
          <Row label="Regular medication (specify)"><TextVal value={meds.regularMedicationText} /></Row>
        </Section>

        <Section title="4. Allergies & Nil By Mouth">
          <Row label="Allergies documented"><YesNo value={allerg.allergiesDocumented} /></Row>
          <Row label="Allergies (state in red)">
            <span className="font-bold" style={{ color: '#b91c1c' }}>
              <TextVal value={allerg.allergiesDetails} />
            </span>
          </Row>
          <Row label="Nil by mouth"><YesNo value={allerg.npoStatus} /></Row>
          <Row label="Fasted from (time)"><TextVal value={allerg.npoFastedFromTime} /></Row>
        </Section>

        <Section title="5. Peri-operative preparation">
          <Row label="Bath/shower/gown"><YesNo value={prep.bathGown} /></Row>
          <Row label="Shave/skin preparation"><YesNo value={prep.shaveSkinPrep} /></Row>
          <Row label="ID band"><YesNo value={prep.idBandOn} /></Row>
          <Row label="Patient positioned on canvas"><YesNo value={prep.correctPositioning} /></Row>
          <Row label="Jewellery/valuables removed"><YesNo value={prep.jewelryRemoved} /></Row>
          <Row label="Make-up/nail varnish removed"><YesNo value={prep.makeupNailPolishRemoved} /></Row>
        </Section>

        <Section title="6. Prosthetics">
          <Row label="Contact lens removed"><YesNo value={pros.contactLensRemoved} /></Row>
          <Row label="Hearing aid/limbs"><YesNo value={pros.limbsProsthesisNoted} /></Row>
          <Row label="Caps/crowns/bridgework present"><YesNo value={pros.crownsBridgeworkNoted} /></Row>
          <Row label="Dentures removed"><YesNo value={pros.denturesRemoved} /></Row>
        </Section>

        <Section title="7. Nursing observations (immediate pre-op)">
          <Row label="Blood pressure">
            <TextVal value={vit.bpSystolic && vit.bpDiastolic ? `${vit.bpSystolic}/${vit.bpDiastolic} mmHg` : ''} />
          </Row>
          <Row label="Pulse rate"><TextVal value={vit.pulse !== undefined ? `${vit.pulse} bpm` : ''} /></Row>
          <Row label="Respiratory rate"><TextVal value={vit.respiratoryRate !== undefined ? `${vit.respiratoryRate} /min` : ''} /></Row>
          <Row label="CVP"><TextVal value={vit.cvp} /></Row>
          <Row label="Temperature"><TextVal value={vit.temperature !== undefined ? `${vit.temperature} °C` : ''} /></Row>
          <Row label="Bladder emptied"><YesNo value={vit.bladderEmptied} /></Row>
          <Row label="Foetal heart rate"><TextVal value={vit.foetalHeartRate !== undefined ? `${vit.foetalHeartRate} bpm` : ''} /></Row>
          <Row label="Other forms as required"><TextVal value={vit.otherFormsRequired} /></Row>
        </Section>

        <Section title="8. Transfer & handover">
          <Row label="Prepared by (name)"><TextVal value={hand.preparedByName} /></Row>
          <Row label="Time arrived in theatre"><TextVal value={hand.timeArrivedInTheatre} /></Row>
          <Row label="Received by (name)"><TextVal value={hand.receivedByName} /></Row>
          <Row label="Handed over by (name)"><TextVal value={hand.handedOverByName} /></Row>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {([
              { label: 'Prepared by', sig: hand.preparedBySignature?.signatureDataUrl },
              { label: 'Received by', sig: hand.receivedBySignature?.signatureDataUrl },
              { label: 'Handed over by', sig: hand.handedOverBySignature?.signatureDataUrl },
            ] as Array<{ label: string; sig?: string }>).map((s) => (
              <div key={s.label} className="border border-slate-300 bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {s.label} signature
                </div>
                <div className="mt-2 flex h-20 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50">
                  {s.sig ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.sig} alt={`${s.label} signature`} className="h-full w-full bg-white object-contain" />
                  ) : (
                    <span className="text-xs italic text-slate-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </article>
  );
}

