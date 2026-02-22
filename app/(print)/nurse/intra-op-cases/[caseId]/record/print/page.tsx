/**
 * Print View: Intra-Operative Nursing Record
 *
 * Placed in the (print) route group to escape the nurse layout
 * and prevent HTML nesting errors.
 *
 * URL: /nurse/intra-op-cases/[caseId]/record/print
 * Uses: force-dynamic, PDF-ready layout, DRAFT/FINAL watermark,
 *       PrintButton client component, ?autoprint=1 support.
 */

import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { INTRAOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_VERSION } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { format } from 'date-fns';
import Image from 'next/image';
import { AutoPrint, PrintButton } from '@/app/(print)/nurse/ward-prep/[id]/checklist/print/AutoPrint';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ caseId: string }>; searchParams: Promise<{ autoprint?: string }> };

export default async function PrintIntraOpRecordPage({ params, searchParams }: Params) {
    const { caseId } = await params;
    const { autoprint: autoprintParam } = await searchParams;

    // Precise select for performance
    const surgicalCase = await db.surgicalCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            procedure_name: true,
            side: true,
            created_at: true,
            patient: {
                select: {
                    first_name: true,
                    last_name: true,
                    file_number: true,
                },
            },
            primary_surgeon: {
                select: { name: true },
            },
            theater_booking: {
                select: { start_time: true },
            },
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
            signed_by: {
                select: { first_name: true, last_name: true },
            },
        },
    });

    if (!record) {
        return (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
                <h1 style={{ color: '#dc2626' }}>Record Not Found</h1>
                <p>No intra-operative record has been started for this case.</p>
            </div>
        );
    }

    const d = JSON.parse(record.data_json);
    const isFinalized = record.status === 'FINAL';
    const isAmendment = record.status === 'AMENDMENT';

    const caseDate = surgicalCase.theater_booking?.start_time || surgicalCase.created_at;
    const formatDate = (date: Date | null | undefined) =>
        date ? format(new Date(date), 'dd MMM yyyy') : '—';
    const formatDateTime = (date: Date | null | undefined) =>
        date ? format(new Date(date), 'dd MMM yyyy HH:mm') : '—';

    const watermarkText = isFinalized ? 'FINAL' : isAmendment ? 'AMENDMENT' : 'DRAFT';

    return (
        <>
            <style>{`
                @media print {
                    body > *:not(#intraop-print-root) { display: none !important; }
                    #intraop-print-root { display: block !important; }
                    .no-print { display: none !important; }
                }
                .watermark {
                    position: fixed; top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    font-size: 80px; font-weight: 900;
                    color: rgba(0,0,0,0.04);
                    pointer-events: none; z-index: 0; white-space: nowrap;
                }
                @page { size: A4; margin: 15mm; }
            `}</style>

            {autoprintParam === '1' && <AutoPrint />}
            <PrintButton />

            <div className="watermark">{watermarkText}</div>

            <div
                id="intraop-print-root"
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: '#fff', overflowY: 'auto',
                    fontFamily: 'Arial, sans-serif', fontSize: 11,
                }}
            >
                <div style={{ maxWidth: 794, margin: '0 auto', padding: '24px 32px' }}>

                    {/* ─── PAGE 1 ─────────────────────────────────────────── */}

                    {/* Header */}
                    <header style={{ borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Image src="/assets/images/logo-black.png" alt="NSAC Logo" width={44} height={44} style={{ objectFit: 'contain' }} />
                            <div>
                                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Intra-Operative Nursing Record</h1>
                                <p style={{ margin: 0, fontSize: 9, fontWeight: 600 }}>Nairobi Sculpt Aesthetic Centre</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 9 }}>
                            <p style={{ margin: 0 }}><strong>Case ID:</strong> {surgicalCase.id.slice(0, 8).toUpperCase()}</p>
                            <p style={{ margin: 0 }}><strong>Date:</strong> {formatDate(caseDate)}</p>
                            <p style={{ margin: '2px 0 0', padding: '2px 6px', background: isFinalized ? '#d1fae5' : isAmendment ? '#fef3c7' : '#f1f5f9', borderRadius: 4, fontWeight: 700, fontSize: 8, textTransform: 'uppercase' }}>
                                {watermarkText}
                            </p>
                        </div>
                    </header>

                    {/* Patient Info */}
                    <section style={{ marginBottom: 12, border: '1px solid #000', padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 10 }}>
                        <div>
                            <span style={{ fontWeight: 700, display: 'block', fontSize: 8, color: '#475569', textTransform: 'uppercase' }}>Patient Name</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{surgicalCase.patient.first_name} {surgicalCase.patient.last_name}</span>
                        </div>
                        <div>
                            <span style={{ fontWeight: 700, display: 'block', fontSize: 8, color: '#475569', textTransform: 'uppercase' }}>File Number</span>
                            <span style={{ fontSize: 13 }}>{surgicalCase.patient.file_number}</span>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                            <span style={{ fontWeight: 700, display: 'block', fontSize: 8, color: '#475569', textTransform: 'uppercase' }}>Procedure</span>
                            <span>{surgicalCase.procedure_name}{surgicalCase.side ? ` (${surgicalCase.side})` : ''} {surgicalCase.primary_surgeon ? `— Dr. ${surgicalCase.primary_surgeon.name}` : ''}</span>
                        </div>
                    </section>

                    {/* Two-column layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* LEFT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Section title="1. Arrival &amp; Entry">
                                <Row label="Arrival Method" value={d.entry?.arrivalMethod} />
                                <Row label="Time In" value={d.entry?.timeIn} />
                                <Row label="ASA Class" value={d.entry?.asaClass} />
                                {d.entry?.allergies && <Note label="Allergies" value={d.entry.allergies} />}
                                {d.entry?.comments && <Note label="Comments" value={d.entry.comments} />}
                            </Section>

                            <Section title="2. Safety Checks &amp; IV">
                                <Row label="ID Verified" value={d.safety?.patientIdVerified ? 'Yes' : 'No'} />
                                <Row label="Consent Signed" value={d.safety?.informedConsentSigned ? 'Yes' : 'No'} />
                                <Row label="Pre-Op Complete" value={d.safety?.preOpChecklistCompleted ? 'Yes' : 'No'} />
                                <Row label="WHO Complete" value={d.safety?.whoChecklistCompleted ? 'Yes' : 'No'} />
                                <Row label="IV Infusing" value={d.safety?.arrivedWithIvInfusing ? 'Yes' : 'No'} />
                                {d.safety?.arrivedWithIvInfusing && <>
                                    <Row label="IV Started By" value={d.safety.ivStartedBy} />
                                    <Row label="IV Start Time" value={d.safety.ivStartTime} />
                                </>}
                                <Row label="Antibiotic Ordered" value={d.safety?.antibioticOrdered ? 'Yes' : 'No'} />
                                {d.safety?.antibioticOrdered && <>
                                    <Row label="Type" value={d.safety.antibioticType} />
                                    <Row label="Ordered by" value={d.safety.antibioticOrderedBy} />
                                    <Row label="Time" value={d.safety.antibioticTime} />
                                </>}
                            </Section>

                            <Section title="3. Theatrical Timings">
                                <Row label="Into Theatre" value={d.timings?.timeIntoTheatre} />
                                <Row label="Operation Start" value={d.timings?.operationStart} />
                                <Row label="Operation Finish" value={d.timings?.operationFinish} />
                                <Row label="Out of Theatre" value={d.timings?.timeOutOfTheatre} />
                            </Section>

                            <Section title="8. Skin Preparation">
                                <Row label="Shaved By" value={d.skinPrep?.shavedBy} />
                                <Row label="Prep Agent" value={d.skinPrep?.prepAgent === 'OTHER' ? d.skinPrep?.otherPrepAgent : d.skinPrep?.prepAgent} />
                            </Section>

                            <Section title="11. Closure &amp; Dressing">
                                <Row label="Skin Closure" value={d.closure?.skinClosure || d.closure?.skinClosureMethod} />
                                <Row label="Dressing" value={d.closure?.dressingApplied || d.closure?.dressingType} />
                                <Row label="Count Verified By" value={d.closure?.countVerifiedBy} />
                            </Section>
                        </div>

                        {/* RIGHT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Section title="4. Surgical Team">
                                <Row label="Surgeon" value={d.staffing?.surgeon} />
                                <Row label="Assistant" value={d.staffing?.assistant} />
                                <Row label="Anaesthesiologist" value={d.staffing?.anaesthesiologist} />
                                <Row label="Scrub Nurse" value={d.staffing?.scrubNurse} />
                                <Row label="Circulating Nurse" value={d.staffing?.circulatingNurse} />
                                {d.staffing?.observers && <Note label="Observers" value={d.staffing.observers} />}
                            </Section>

                            <Section title="5. Diagnoses &amp; Operation">
                                {d.diagnoses?.preOpDiagnosis && <Note label="Pre-Op Dx" value={d.diagnoses.preOpDiagnosis} />}
                                {d.diagnoses?.intraOpDiagnosis && <Note label="Intra-Op Dx" value={d.diagnoses.intraOpDiagnosis} />}
                                {d.diagnoses?.operationPerformed && <Note label="Operation" value={d.diagnoses.operationPerformed} />}
                            </Section>

                            <Section title="6. Positioning &amp; Alignment">
                                <Row label="Position" value={d.positioning?.position === 'OTHER' ? d.positioning?.otherPosition : d.positioning?.position} />
                                <Row label="Safety Belt" value={d.positioning?.safetyBeltApplied ? `Applied${d.positioning.safetyBeltPosition ? ` (${d.positioning.safetyBeltPosition})` : ''}` : 'No'} />
                                <Row label="Arms Secured" value={d.positioning?.armsSecured ? `Yes${d.positioning.armsPosition ? ` (${d.positioning.armsPosition})` : ''}` : 'No'} />
                                <Row label="Alignment Correct" value={d.positioning?.bodyAlignmentCorrect ? 'Yes' : 'No'} />
                                {d.positioning?.pressurePointsDescribe && <Note label="Pressure Points" value={d.positioning.pressurePointsDescribe} />}
                            </Section>

                            <Section title="7. Catheterization">
                                <Row label="In Situ" value={d.catheter?.inSitu ? 'Yes' : 'No'} />
                                <Row label="Inserted in Theatre" value={d.catheter?.insertedInTheatre ? 'Yes' : 'No'} />
                                <Row label="Type / Size" value={`${d.catheter?.type || '—'} / ${d.catheter?.size || '—'}`} />
                            </Section>

                            <Section title="9. Equipment">
                                <span style={{ fontWeight: 700, fontSize: 8, textTransform: 'uppercase', color: '#64748b' }}>Electrosurgical</span>
                                <Row label="Used" value={d.equipment?.electrosurgical?.cauteryUsed ? 'Yes' : 'No'} />
                                {d.equipment?.electrosurgical?.cauteryUsed && <>
                                    <Row label="Unit / Mode" value={`${d.equipment.electrosurgical.unitNo || '—'} / ${d.equipment.electrosurgical.mode || '—'}`} />
                                    <Row label="Cut / Coag" value={`${d.equipment.electrosurgical.cutSet || '—'} / ${d.equipment.electrosurgical.coagSet || '—'}`} />
                                    <Row label="Skin B/A" value={`${d.equipment.electrosurgical.skinCheckedBefore ? 'Yes' : 'No'} / ${d.equipment.electrosurgical.skinCheckedAfter ? 'Yes' : 'No'}`} />
                                </>}
                                <span style={{ fontWeight: 700, fontSize: 8, textTransform: 'uppercase', color: '#64748b', marginTop: 4, display: 'block' }}>Tourniquet</span>
                                <Row label="Used" value={d.equipment?.tourniquet?.tourniquetUsed ? 'Yes' : 'No'} />
                                {d.equipment?.tourniquet?.tourniquetUsed && <>
                                    <Row label="Type/Site/Side" value={`${d.equipment.tourniquet.type || '—'} / ${d.equipment.tourniquet.site || '—'} (${d.equipment.tourniquet.laterality || '—'})`} />
                                    <Row label="Pressure" value={d.equipment.tourniquet.pressure} />
                                    <Row label="On/Off" value={`${d.equipment.tourniquet.timeOn || '—'} → ${d.equipment.tourniquet.timeOff || '—'}`} />
                                </>}
                            </Section>

                            <Section title="10. Surgical Details">
                                <Row label="Wound Class" value={d.surgicalDetails?.woundClass} />
                                <Row label="Irrigation" value={d.surgicalDetails?.woundIrrigation?.join(', ') || 'None'} />
                                <Row label="Drains" value={d.surgicalDetails?.drainType?.join(', ') || 'None'} />
                                <Row label="Wound Pack" value={`${d.surgicalDetails?.woundPackType || '—'} @ ${d.surgicalDetails?.woundPackSite || '—'}`} />
                                {d.surgicalDetails?.intraOpXraysTaken && <Note label="X-Rays" value={d.surgicalDetails.intraOpXraysTaken} />}
                            </Section>
                        </div>
                    </div>

                    {/* Counts Table */}
                    <Section title="12. Instruments &amp; Sharps Count">
                        <table style={{ width: '100%', fontSize: 9, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Item', 'Preliminary', 'Wound Closure', 'Final Count'].map(h => (
                                        <th key={h} style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: h === 'Item' ? 'left' : 'center' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(d.counts?.items || []).map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{item.name}</td>
                                        <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{item.preliminary ?? 0}</td>
                                        <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{item.woundClosure ?? 0}</td>
                                        <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>{item.final ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: 32, marginTop: 6 }}>
                            <Row label="Count Correct?" value={d.counts?.countCorrect ? 'Yes ✓' : 'No ✗'} />
                            {!d.counts?.countCorrect && d.counts?.actionIfIncorrect && <Note label="Action" value={d.counts.actionIfIncorrect} />}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 8, textTransform: 'uppercase', display: 'block' }}>Scrub Nurse Signature</span>
                                <span style={{ fontStyle: 'italic' }}>{d.counts?.scrubNurseSignature || '—'}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 8, textTransform: 'uppercase', display: 'block' }}>Circulating Nurse Signature</span>
                                <span style={{ fontStyle: 'italic' }}>{d.counts?.circulatingNurseSignature || '—'}</span>
                            </div>
                        </div>
                    </Section>

                    {/* Fluids */}
                    <Section title="13. Fluids &amp; Transfusions">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                            {[
                                { label: 'Est. Blood Loss', value: `${d.fluids?.estimatedBloodLossMl ?? 0} mL` },
                                { label: 'Urine Output', value: `${d.fluids?.urinaryOutputMl ?? 0} mL` },
                                { label: 'Packed Cells', value: `${d.fluids?.bloodTransfusionPackedCellsMl ?? 0} mL` },
                                { label: 'Whole Blood', value: `${d.fluids?.bloodTransfusionWholeMl ?? 0} mL` },
                                { label: 'IV Fluids Total', value: `${d.fluids?.ivInfusionTotalMl ?? 0} mL` },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ border: '1px solid #e2e8f0', padding: '4px 6px', borderRadius: 4 }}>
                                    <span style={{ fontSize: 8, color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Medications */}
                    {d.medications?.length > 0 && (
                        <Section title="Medications">
                            <table style={{ width: '100%', fontSize: 9, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Drug', 'Route', 'Time', 'Sign'].map(h => (
                                            <th key={h} style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.medications.map((m: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{m.drug || m.name}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{m.route}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{m.time}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', fontStyle: 'italic' }}>{m.sign || m.administeredBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    {/* Implants */}
                    {d.implants?.length > 0 && (
                        <Section title="Implants / Prosthesis">
                            <table style={{ width: '100%', fontSize: 9, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Item', 'Lot No.', 'Size'].map(h => (
                                            <th key={h} style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.implants.map((imp: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{imp.item || imp.name}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{imp.lotNo}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{imp.size}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    {/* Specimens */}
                    {d.specimens?.length > 0 && (
                        <Section title="Specimens">
                            <table style={{ width: '100%', fontSize: 9, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Type', 'Hist', 'Cyto', 'NA', 'Disposition'].map(h => (
                                            <th key={h} style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.specimens.map((s: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{s.type}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{s.histology ? '✓' : ''}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{s.cytology ? '✓' : ''}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{s.notForAnalysis ? '✓' : ''}</td>
                                            <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{s.disposition}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    {/* Items to Return */}
                    {d.itemsToReturnToTheatre && (
                        <Section title="Items to Return to Theatre">
                            <p style={{ margin: '4px 0', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                                {d.itemsToReturnToTheatre}
                            </p>
                        </Section>
                    )}

                    {/* Signature Footer */}
                    <footer style={{ marginTop: 24, paddingTop: 12, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 10 }}>
                        <div>
                            {isFinalized && record.signed_by ? (
                                <>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 8, color: '#475569', textTransform: 'uppercase' }}>Electronically Signed By</p>
                                    <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700 }}>{record.signed_by.first_name} {record.signed_by.last_name}</p>
                                    <p style={{ margin: 0, fontSize: 8, color: '#475569', textTransform: 'uppercase' }}>Nurse Circulator / Final Sign-off</p>
                                </>
                            ) : (
                                <>
                                    <p style={{ margin: 0, fontWeight: 700, color: '#d97706' }}>⚠ {isAmendment ? 'Amendment in progress — not yet re-finalized' : 'Draft — not yet finalized'}</p>
                                    <div style={{ marginTop: 16, borderBottom: '1px solid #000', width: 200 }}></div>
                                    <p style={{ margin: '2px 0 0', fontSize: 8, color: '#64748b' }}>Signature</p>
                                </>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 9 }}>
                            {record.signed_at && <p style={{ margin: 0, fontWeight: 600 }}>Signed: {formatDateTime(record.signed_at)}</p>}
                            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontStyle: 'italic' }}>
                                Generated: {formatDateTime(new Date())} · Case {caseId.slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Helper components (PDF-safe inline styles)
// ──────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4, letterSpacing: 0.5 }}>
                {title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {children}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 9 }}>
            <span style={{ color: '#475569', fontWeight: 500, paddingRight: 8, flexShrink: 0 }}>{label}:</span>
            <span style={{ fontWeight: 700, textAlign: 'right' }}>{value || '—'}</span>
        </div>
    );
}

function Note({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div style={{ marginTop: 2, fontSize: 9, padding: '2px 4px', background: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>{label}: </span>
            <span style={{ fontStyle: 'italic' }}>{value}</span>
        </div>
    );
}
