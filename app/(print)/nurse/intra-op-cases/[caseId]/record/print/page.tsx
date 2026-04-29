/**
 * Print View: Nursing Operation Record (2 pages)
 *
 * URL: /nurse/intra-op-cases/[caseId]/record/print
 */

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import db from '@/lib/db';
import { INTRAOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_VERSION } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { format } from 'date-fns';
import Image from 'next/image';
import { AutoPrint, PrintButton } from '@/app/(print)/nurse/ward-prep/[id]/checklist/print/AutoPrint';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ caseId: string }>; searchParams: Promise<{ autoprint?: string }> };

function ynTick(v: unknown, expected: 'Y' | 'N') {
  return v === expected ? '☑' : '☐';
}

function tick(v: boolean) {
  return v ? '☑' : '☐';
}

function val(v: unknown) {
  if (v === null || v === undefined) return '—';
  const s = String(v);
  return s.trim() ? s : '—';
}

function Field(props: { label: string; value: unknown }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <div style={{ width: 210, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
        {props.label}
      </div>
      <div style={{ flex: 1, borderBottom: '1px solid #cbd5e1', minHeight: 16, paddingBottom: 1 }}>
        {val(props.value)}
      </div>
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        {props.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{props.children}</div>
    </div>
  );
}

function TickRow(props: { label: string; options: Array<{ label: string; checked: boolean }> }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ width: 210, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
        {props.label}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {props.options.map((o) => (
          <div key={o.label} style={{ fontSize: 11 }}>
            {o.checked ? '☑' : '☐'} {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function PrintNursingOperationRecordPage({ params, searchParams }: Params) {
  const { caseId } = await params;
  const { autoprint } = await searchParams;

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      created_at: true,
      patient: { select: { first_name: true, last_name: true, file_number: true } },
    },
  });
  if (!surgicalCase) notFound();

  const record = await db.clinicalFormResponse.findUnique({
    where: {
      template_key_template_version_surgical_case_id: {
        template_key: INTRAOP_TEMPLATE_KEY,
        template_version: INTRAOP_TEMPLATE_VERSION,
        surgical_case_id: caseId,
      },
    },
    select: {
      id: true,
      status: true,
      data_json: true,
      signed_at: true,
    },
  });
  if (!record) {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: '#dc2626' }}>Record Not Found</h1>
        <p>No nursing operation record has been started for this case.</p>
      </div>
    );
  }

  const d = JSON.parse(record.data_json) as any;
  const isFinal = record.status === 'FINAL';
  const watermarkText = isFinal ? 'FINAL' : record.status === 'AMENDMENT' ? 'AMENDMENT' : 'DRAFT';

  const today = format(new Date(), 'dd MMM yyyy, HH:mm');

  const meds = Array.isArray(d.medications) ? d.medications : [];
  const implants = Array.isArray(d.implants) ? d.implants : [];
  const specimens = Array.isArray(d.specimens) ? d.specimens : [];

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#nursing-op-print-root) { display: none !important; }
          #nursing-op-print-root { display: block !important; }
          .no-print { display: none !important; }
        }
        .watermark {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 80px; font-weight: 900;
          color: rgba(0,0,0,0.04);
          pointer-events: none; z-index: 0; white-space: nowrap;
        }
        @page { size: A4; margin: 12mm; }
      `}</style>

      {autoprint === '1' && <AutoPrint />}
      <PrintButton />
      <div className="watermark">{watermarkText}</div>

      <div
        id="nursing-op-print-root"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#fff',
          overflowY: 'auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: 11,
        }}
      >
        <div style={{ maxWidth: 794, margin: '0 auto', padding: '20px 28px' }}>
          {/* PAGE 1 */}
          <header style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Image src="/assets/images/logo-black.png" alt="Logo" width={48} height={48} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.6 }}>
                  NAIROBI SCULPT AESTHETIC CENTRE
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8 }}>
                  NURSING OPERATION RECORD
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
              <div>Generated: {today}</div>
              {record.signed_at && <div>Signed: {format(new Date(record.signed_at), 'dd MMM yyyy, HH:mm')}</div>}
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <Section title="Patient Identification">
              <Field label="Patient file no." value={d.patientFileNo} />
              <Field label="Name" value={d.patientName} />
              <Field label="Age" value={d.age} />
              <Field label="Sex" value={d.sex} />
              <Field label="Date" value={d.date} />
              <Field label="Doctor" value={d.doctor} />
            </Section>

            <Section title="Arrival Details">
              <Field label="Date" value={d.arrivalDate} />
              <Field label="Time in" value={d.timeIn} />
              <TickRow
                label="Mode"
                options={[
                  { label: 'Stretcher', checked: d.arrivalMode === 'Stretcher' },
                  { label: 'Wheelchair', checked: d.arrivalMode === 'Wheelchair' },
                  { label: 'Walking', checked: d.arrivalMode === 'Walking' },
                ]}
              />
              <Field label="Allergies" value={d.allergies} />
              <TickRow
                label="ASA Class"
                options={[
                  { label: '1', checked: d.asaClass === 1 },
                  { label: '2', checked: d.asaClass === 2 },
                  { label: '3', checked: d.asaClass === 3 },
                  { label: '4', checked: d.asaClass === 4 },
                ]}
              />
              <Field label="Comments" value={d.comments} />
            </Section>

            <Section title="Pre-op Checklist (Y/N)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, fontSize: 11 }}>
                <div />
                <div style={{ fontWeight: 800 }}>Y</div>
                <div style={{ fontWeight: 800 }}>N</div>

                <div>Patient ID verified with Reg No.</div>
                <div>{ynTick(d.patientIdVerified, 'Y')}</div>
                <div>{ynTick(d.patientIdVerified, 'N')}</div>

                <div>Informed consent signed</div>
                <div>{ynTick(d.informedConsentSigned, 'Y')}</div>
                <div>{ynTick(d.informedConsentSigned, 'N')}</div>

                <div>Pre-op checklist completed</div>
                <div>{ynTick(d.preOpChecklistCompleted, 'Y')}</div>
                <div>{ynTick(d.preOpChecklistCompleted, 'N')}</div>

                <div>WHO checklist completed</div>
                <div>{ynTick(d.whoChecklistCompleted, 'Y')}</div>
                <div>{ynTick(d.whoChecklistCompleted, 'N')}</div>

                <div>Arrived with IV infusing</div>
                <div>{ynTick(d.arrivedWithIVInfusing, 'Y')}</div>
                <div>{ynTick(d.arrivedWithIVInfusing, 'N')}</div>
              </div>

              <Field label="IV started by" value={d.ivStartedBy} />
              <Field label="Time" value={d.ivStartTime} />
              <TickRow
                label="Position"
                options={[
                  { label: 'RA', checked: d.cannulaPosition === 'RA' },
                  { label: 'LA', checked: d.cannulaPosition === 'LA' },
                  { label: 'RL', checked: d.cannulaPosition === 'RL' },
                  { label: 'LL', checked: d.cannulaPosition === 'LL' },
                  { label: `Other ${d.cannulaPosition === 'Other' ? `(${d.cannulaPositionOther || ''})` : ''}`, checked: d.cannulaPosition === 'Other' },
                ]}
              />
            </Section>

            <Section title="Theatre Timing & Safety">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, fontSize: 11 }}>
                <div>Antibiotic ordered</div>
                <div>{ynTick(d.antibioticOrdered, 'Y')} Y</div>
                <div>{ynTick(d.antibioticOrdered, 'N')} N</div>
              </div>
              <Field label="Type" value={d.antibioticType} />
              <Field label="Ordered by" value={d.antibioticOrderedBy} />
              <Field label="Time" value={d.antibioticTime} />
              <Field label="Time in theatre" value={d.timeInTheatre} />
              <Field label="Time out of theatre" value={d.timeOutOfTheatre} />
              <Field label="Operation start" value={d.operationStart} />
              <Field label="Finish" value={d.operationFinish} />
              <Field label="Safety belt applied (Y/N)" value={d.safetyBeltApplied} />
              <Field label="Position" value={d.safetyBeltPosition} />
              <Field label="Arms secured (Y/N)" value={d.armsSecured} />
              <Field label="Position" value={d.armsPosition} />
              <Field label="Patient in proper body alignment (Y/N)" value={d.properBodyAlignment} />
              <Field label="Pressure points (describe)" value={d.pressurePointsDescription} />
            </Section>

            <Section title="Urinary Catheter & Intra-op Imaging">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, fontSize: 11 }}>
                <div>Urinary catheter in-situ</div>
                <div>{ynTick(d.urinaryCatheterInSitu, 'Y')} Y</div>
                <div>{ynTick(d.urinaryCatheterInSitu, 'N')} N</div>
                <div>Urinary catheter inserted in theatre</div>
                <div>{ynTick(d.urinaryCatheterInsertedInTheatre, 'Y')} Y</div>
                <div>{ynTick(d.urinaryCatheterInsertedInTheatre, 'N')} N</div>
              </div>
              <Field label="Type" value={d.catheterType} />
              <Field label="Size" value={d.catheterSize} />
              <Field label="Intra-op X-Rays taken" value={d.intraOpXRays} />
            </Section>

            <Section title="Patient Position (tick)">
              <TickRow
                label="Position"
                options={[
                  { label: 'Prone', checked: d.patientPosition === 'Prone' },
                  { label: 'Supine', checked: d.patientPosition === 'Supine' },
                  { label: 'Lateral', checked: d.patientPosition === 'Lateral' },
                  { label: 'Lithotomy', checked: d.patientPosition === 'Lithotomy' },
                  { label: `Other ${d.patientPosition === 'Other' ? `(${d.patientPositionOther || ''})` : ''}`, checked: d.patientPosition === 'Other' },
                ]}
              />
            </Section>

            <Section title="Skin Prep">
              <Field label="Shaved by" value={d.shavedBy} />
              <TickRow
                label="Prep"
                options={[
                  { label: 'Hibitane in spirit', checked: (d.skinPrepAgents || []).includes('Hibitane in Spirit') },
                  { label: 'Povidone iodine', checked: (d.skinPrepAgents || []).includes('Povidone Iodine') },
                  { label: 'Hibitane in water', checked: (d.skinPrepAgents || []).includes('Hibitane in Water') },
                  { label: `Other ${((d.skinPrepAgents || []).includes('Other') && d.skinPrepOther) ? `(${d.skinPrepOther})` : ''}`, checked: (d.skinPrepAgents || []).includes('Other') },
                ]}
              />
            </Section>

            <Section title="Electrosurgical Unit">
              <Field label="Unit No." value={d.electrosurgicalUnitNo} />
              <Field label="Mode" value={d.electrosurgicalMode} />
              <Field label="Coat. set" value={d.coatSet} />
              <Field label="Cut set" value={d.cutSet} />
              <Field label="Skin checked before" value={d.electrosurgicalSkinCheckedBefore} />
              <Field label="Skin checked after" value={d.electrosurgicalSkinCheckedAfter} />
            </Section>

            <Section title="Tourniquet">
              <Field label="Type" value={d.tourniquetType} />
              <Field label="Site" value={d.tourniquetSite} />
              <TickRow
                label="Rt./Lt."
                options={[
                  { label: 'Rt.', checked: d.tourniquetSide === 'Rt.' },
                  { label: 'Lt.', checked: d.tourniquetSide === 'Lt.' },
                ]}
              />
              <Field label="Pressure" value={d.tourniquetPressure} />
              <Field label="Time on" value={d.tourniquetTimeOn} />
              <Field label="Time off" value={d.tourniquetTimeOff} />
              <Field label="Skin checked before" value={d.tourniquetSkinCheckedBefore} />
              <Field label="Skin checked after" value={d.tourniquetSkinCheckedAfter} />
            </Section>

            <Section title="Drain Type / Wound Irrigation / Wound Pack / Wound Class">
              <TickRow
                label="Drain type"
                options={[
                  { label: 'Corrugated', checked: (d.drainTypes || []).includes('Corrugated') },
                  { label: 'Portovac', checked: (d.drainTypes || []).includes('Portovac') },
                  { label: 'UWS', checked: (d.drainTypes || []).includes('UWS') },
                  { label: 'NG', checked: (d.drainTypes || []).includes('NG') },
                  { label: `Other ${((d.drainTypes || []).includes('Other') && d.drainTypeOther) ? `(${d.drainTypeOther})` : ''}`, checked: (d.drainTypes || []).includes('Other') },
                ]}
              />
              <TickRow
                label="Wound irrigation"
                options={[
                  { label: 'Saline', checked: (d.woundIrrigation || []).includes('Saline') },
                  { label: 'Water', checked: (d.woundIrrigation || []).includes('Water') },
                  { label: 'Povidone iodine', checked: (d.woundIrrigation || []).includes('Povidone Iodine') },
                  { label: 'Antibiotic', checked: (d.woundIrrigation || []).includes('Antibiotic') },
                  { label: `Other ${((d.woundIrrigation || []).includes('Other') && d.woundIrrigationOther) ? `(${d.woundIrrigationOther})` : ''}`, checked: (d.woundIrrigation || []).includes('Other') },
                ]}
              />
              <Field label="Wound pack type" value={d.woundPackType} />
              <Field label="Wound pack site" value={d.woundPackSite} />
              <TickRow
                label="Wound class"
                options={[
                  { label: 'Clean', checked: d.woundClass === 'Clean' },
                  { label: 'Clean contaminated', checked: d.woundClass === 'Clean Contaminated' },
                  { label: 'Contaminated', checked: d.woundClass === 'Contaminated' },
                  { label: 'Infected', checked: d.woundClass === 'Infected' },
                ]}
              />
            </Section>

            <Section title="Surgical Team & Anaesthesia">
              <Field label="Surgeon" value={d.surgeon} />
              <Field label="Assistant" value={d.assistant} />
              <Field label="Anaesthesiologist" value={d.anaesthesiologist} />
              <Field label="Scrub nurse" value={d.scrubNurse} />
              <Field label="Circulating nurse" value={d.circulatingNurse} />
              <Field label="Observers / other" value={d.observers} />
              <TickRow
                label="Type of anaesthesia"
                options={[
                  { label: 'General', checked: d.anaesthesiaType === 'General' },
                  { label: 'Spinal', checked: d.anaesthesiaType === 'Spinal' },
                  { label: 'Regional', checked: d.anaesthesiaType === 'Regional' },
                  { label: 'Local', checked: d.anaesthesiaType === 'Local' },
                ]}
              />
              {d.anaesthesiaDetail && <Field label="Detail" value={d.anaesthesiaDetail} />}
            </Section>

            <Section title="Diagnosis & Operation">
              <Field label="Pre-op diagnosis" value={d.preOpDiagnosis} />
              <Field label="Intra-op diagnosis" value={d.intraOpDiagnosis} />
              <Field label="Operation(s)" value={d.operationsPerformed} />
            </Section>

            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 6, fontWeight: 700 }}>
              — Nursing Operation Record (continues on page 2) —
            </div>
          </div>

          {/* PAGE 2 */}
          <div style={{ breakBefore: 'page', marginTop: 18 }}>
            <header style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Image src="/assets/images/logo-black.png" alt="Logo" width={42} height={42} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.6 }}>
                    NAIROBI SCULPT AESTHETIC CENTRE
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8 }}>
                    NURSING OPERATION RECORD (CONT.)
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
                <div>Case: {surgicalCase.id}</div>
                <div>Patient: {surgicalCase.patient.file_number}</div>
              </div>
            </header>

            <Section title="Swabs, Instruments & Sharps Count">
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Check point</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Abdominal swabs</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Raytec swabs</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Throat packs</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Other</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Preliminary check', d.swabsCount?.preliminaryCheck],
                      ['Wound closure', d.swabsCount?.woundClosure],
                      ['Final count', d.swabsCount?.finalCount],
                    ].map(([label, row]: any) => (
                      <tr key={label}>
                        <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>{label}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{val(row?.abdominalSwabs)}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{val(row?.raytecSwabs)}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{val(row?.throatPacks)}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{val(row?.other)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
                <div style={{ fontWeight: 800 }}>Count correct</div>
                <div>{ynTick(d.countCorrect, 'Y')} Y</div>
                <div>{ynTick(d.countCorrect, 'N')} N</div>
              </div>
              {d.countCorrect === 'N' && <Field label="Action taken if not" value={d.countActionTaken} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                    Scrub nurse signature
                  </div>
                  <div style={{ height: 80, border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {d.scrubNurseSignature ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="Scrub nurse signature" src={d.scrubNurseSignature} style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                    Circulating nurse signature
                  </div>
                  <div style={{ height: 80, border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {d.circulatingNurseSignature ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="Circulating nurse signature" src={d.circulatingNurseSignature} style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Wound Closure">
              <Field label="Non-absorbable" value={d.nonAbsorbableSuture} />
              <Field label="Absorbable" value={d.absorbableSuture} />
              <Field label="Other" value={d.otherClosure} />
              <Field label="Dressing applied" value={d.dressingApplied} />
            </Section>

            <Section title="Intravenous Infusion / Transfusions (mL)">
              <Field label="Packed cells (mL)" value={d.packedCellsML} />
              <Field label="Whole (mL)" value={d.wholeBloodML} />
              <Field label="Others (mL)" value={d.otherBloodProductsML} />
              <Field label="Intravenous infusion (mL)" value={d.ivInfusionML} />
              <Field label="Estimated blood loss (mL)" value={d.estimatedBloodLossML} />
              <Field label="Urinary output (mL)" value={d.urinaryOutputML} />
            </Section>

            <Section title="Medication">
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Medication / drug</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Route</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const row = meds[i] || {};
                      return (
                        <tr key={i}>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.drug)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.route)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.time)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.sign)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Surgical Implants / Prosthesis">
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Lot No.</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const row = implants[i] || {};
                      return (
                        <tr key={i}>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.item)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.lotNo)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.size)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Specimens">
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Type</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Histology</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Cytology</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Not for analysis</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #cbd5e1' }}>Disposition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => {
                      const row = specimens[i] || {};
                      return (
                        <tr key={i}>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.type)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{tick(row.histology === true)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{tick(row.cytology === true)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{tick(row.notForAnalysis === true)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{val(row.disposition)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Items to be returned to theatre">
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 10, minHeight: 60 }}>
                {val(d.itemsToBeReturnedToTheatre)}
              </div>
            </Section>

            <Section title="Charges">
              <Field label="Anaesthetic materials charge (amount)" value={d.anaestheticMaterialsCharge} />
              <Field label="Theatre fee (amount)" value={d.theatreFee} />
            </Section>

            <div style={{ marginTop: 10, textAlign: 'center', fontSize: 10, fontWeight: 800 }}>
              End of Nursing Operation Record — Nairobi Sculpt Aesthetic Centre
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
