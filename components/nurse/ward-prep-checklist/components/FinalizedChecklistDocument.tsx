'use client';

import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '—';
  return name.match(/^(Dr\\.?|Dr\\s)/i) ? name : `Dr. ${name}`;
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
    <div className="grid grid-cols-12 gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <div className="col-span-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</div>
      <div className="col-span-7 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-8 py-7 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            NAIROBI SCULPT AESTHETIC CENTRE
          </div>
          <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
            PRE-OPERATIVE WARD CHECK-LIST
          </div>
          <div className="mt-1 text-sm text-slate-600">
            All information should be filled in clearly before the patient is received in theatre
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 h-8" asChild>
          <a href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank" rel="noopener noreferrer">
            <Printer className="h-3.5 w-3.5" />
            Print
          </a>
        </Button>
      </div>

      <div className="px-8 py-7">
        <Section title="1. Documentation">
          <Row label="Ward checklist"><YesNo value={doc.wardChecklist} /></Row>
          <Row label="Complete/correct documentation"><YesNo value={doc.documentationComplete} /></Row>
          <Row label="Correct consent"><YesNo value={doc.correctConsent} /></Row>
        </Section>

        <Section title="2. Blood / Results (Hb, UECs, X-Match)">
          <Row label="Blood/results checked"><YesNo value={labs.bloodResultsChecked} /></Row>
          <Row label="Hb"><TextVal value={(labs as any).hb} /></Row>
          <Row label="UECs"><TextVal value={labs.uecs} /></Row>
          <Row label="Units available"><TextVal value={labs.xMatchUnitsAvailable} /></Row>
        </Section>

        <Section title="3. Medication">
          <Row label="Pre-medication given"><YesNo value={meds.preMedGiven as boolean | undefined} /></Row>
          <Row label="Pre-medication time given"><TextVal value={meds.preMedTimeGiven} /></Row>
          <Row label="Pre-medication (details)"><TextVal value={meds.preMedicationText} /></Row>

          <Row label="Peri-operative medication given"><YesNo value={meds.periOpMedsGiven as boolean | undefined} /></Row>
          <Row label="Peri-operative time given"><TextVal value={(meds as any).periOpMedsTimeGiven} /></Row>
          <Row label="Peri-operative medication (details)"><TextVal value={meds.periOpMedicationText} /></Row>

          <Row label="Regular medication (specify)"><TextVal value={meds.regularMedicationText} /></Row>
        </Section>

        <Section title="4. Allergies & Nil By Mouth">
          <Row label="Allergies documented"><YesNo value={allerg.allergiesDocumented} /></Row>
          <Row label="6. ALLERGIES (STATE IN RED)">
            <span className="font-extrabold" style={{ color: '#b91c1c', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
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
          <Row label="Blood pressure"><TextVal value={(vit.bpSystolic && vit.bpDiastolic) ? `${vit.bpSystolic}/${vit.bpDiastolic} mmHg` : ''} /></Row>
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

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              { label: 'Prepared by', sig: hand.preparedBySignature?.signatureDataUrl },
              { label: 'Received by', sig: hand.receivedBySignature?.signatureDataUrl },
              { label: 'Handed over by', sig: hand.handedOverBySignature?.signatureDataUrl },
            ] as Array<{ label: string; sig?: string }>).map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label} signature</div>
                <div className="mt-2 h-20 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {s.sig ? (
                    <img src={s.sig} alt={`${s.label} signature`} className="h-full w-full object-contain bg-white" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

