import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { INTRAOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_VERSION } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { format } from 'date-fns';
import Image from 'next/image';

// Force dynamic to ensure data is fresh
export const dynamic = 'force-dynamic';

export default async function PrintIntraOpRecordPage({ params }: { params: Promise<{ caseId: string }> }) {
    const { caseId } = await params;

    // Fetch Case & Record
    const surgicalCase = await db.surgicalCase.findUnique({
        where: { id: caseId },
        include: {
            patient: true,
            primary_surgeon: true,
            theater_booking: true,
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
        include: {
            signed_by: true,
        }
    });

    if (!record) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Record Not Found</h1>
                <p>No intra-operative record has been started for this case.</p>
            </div>
        );
    }

    const d = JSON.parse(record.data_json);
    const formatDate = (date: Date | null) => date ? format(date, 'dd MMM yyyy') : '—';
    const formatDateTime = (date: Date | null) => date ? format(date, 'dd MMM yyyy HH:mm') : '—';

    return (
        <div className="bg-white text-black p-8 max-w-[210mm] mx-auto print:p-0 print:max-w-none">
            {/* ─── PAGE 1 ────────────────────────────────────────────────── */}
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <header className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Image
                            src="/assets/images/logo-black.png"
                            alt="NSAC Logo"
                            width={50}
                            height={50}
                            className="object-contain"
                        />
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide">Intra-Operative Nursing Record</h1>
                            <p className="text-xs font-semibold">Nairobi Sculpt Aesthetic Centre</p>
                        </div>
                    </div>
                    <div className="text-right text-xs">
                        <p><strong>Case ID:</strong> {surgicalCase.id.slice(0, 8)}</p>
                        <p><strong>Date:</strong> {formatDate(surgicalCase.theater_booking?.start_time || surgicalCase.created_at)}</p>
                    </div>
                </header>

                {/* Patient Info */}
                <section className="mb-4 border border-black p-3 grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                        <span className="font-bold block uppercase text-slate-500">Patient Name</span>
                        <span className="text-base font-bold">{surgicalCase.patient.first_name} {surgicalCase.patient.last_name}</span>
                    </div>
                    <div>
                        <span className="font-bold block uppercase text-slate-500">File Number</span>
                        <span className="text-base">{surgicalCase.patient.file_number}</span>
                    </div>
                    <div className="col-span-2">
                        <span className="font-bold block uppercase text-slate-500">Procedure</span>
                        <span>{surgicalCase.procedure_name}</span>
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-6 flex-1">
                    {/* LEFT COLUMN */}
                    <div className="space-y-4">
                        <Section title="1. Arrival & Entry">
                            <Row label="Arrival Method" value={d.entry?.arrivalMethod} />
                            <Row label="Time In" value={d.entry?.timeIn} />
                            <Row label="ASA Class" value={d.entry?.asaClass} />
                            <Note label="Allergies" value={d.entry?.allergies} />
                            <Note label="Comments" value={d.entry?.comments} />
                        </Section>

                        <Section title="2. Safety Checks & IV">
                            <Row label="ID Verified" value={d.safety?.patientIdVerified ? 'Yes' : 'No'} />
                            <Row label="Consent Signed" value={d.safety?.informedConsentSigned ? 'Yes' : 'No'} />
                            <Row label="Pre-Op Complete" value={d.safety?.preOpChecklistCompleted ? 'Yes' : 'No'} />
                            <Row label="WHO Complete" value={d.safety?.whoChecklistCompleted ? 'Yes' : 'No'} />
                            <Row label="IV Infusing" value={d.safety?.arrivedWithIvInfusing ? 'Yes' : 'No'} />
                            {d.safety?.arrivedWithIvInfusing && (
                                <>
                                    <Row label="IV Started By" value={d.safety.ivStartedBy} />
                                    <Row label="IV Start Time" value={d.safety.ivStartTime} />
                                </>
                            )}
                            <Row label="Antibiotic Ordered" value={d.safety?.antibioticOrdered ? 'Yes' : 'No'} />
                            {d.safety?.antibioticOrdered && (
                                <>
                                    <Row label="Type" value={d.safety.antibioticType} />
                                    <Row label="Time" value={d.safety.antibioticTime} />
                                </>
                            )}
                        </Section>

                        <Section title="3. Theatrical Timings">
                            <Row label="Into Theatre" value={d.timings?.timeIntoTheatre} />
                            <Row label="Operation Start" value={d.timings?.operationStart} />
                            <Row label="Operation Finish" value={d.timings?.operationFinish} />
                            <Row label="Out of Theatre" value={d.timings?.timeOutOfTheatre} />
                        </Section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                        <Section title="4. Surgical Team">
                            <Row label="Surgeon" value={d.staffing?.surgeon} />
                            <Row label="Assistant" value={d.staffing?.assistant} />
                            <Row label="Anaesthesiologist" value={d.staffing?.anaesthesiologist} />
                            <Row label="Scrub Nurse" value={d.staffing?.scrubNurse} />
                            <Row label="Circulating Nurse" value={d.staffing?.circulatingNurse} />
                            <Note label="Observers" value={d.staffing?.observers} />
                        </Section>

                        <Section title="5. Diagnoses & Operation">
                            <Note label="Pre-Op Diagnosis" value={d.diagnoses?.preOpDiagnosis} />
                            <Note label="Intra-Op Diagnosis" value={d.diagnoses?.intraOpDiagnosis} />
                            <Note label="Operation Performed" value={d.diagnoses?.operationPerformed} />
                        </Section>

                        <Section title="6. Positioning & Alignment">
                            <Row label="Position" value={d.positioning?.position === 'OTHER' ? d.positioning.otherPosition : d.positioning?.position} />
                            <Row label="Safety Belt" value={d.positioning?.safetyBeltApplied ? `Applied (${d.positioning.safetyBeltPosition})` : 'No'} />
                            <Row label="Arms Secured" value={d.positioning?.armsSecured ? `Yes (${d.positioning.armsPosition})` : 'No'} />
                            <Row label="Alignment Correct" value={d.positioning?.bodyAlignmentCorrect ? 'Yes' : 'No'} />
                            <Note label="Pressure Points" value={d.positioning?.pressurePointsDescribe} />
                        </Section>

                        <Section title="7. Catheterization">
                            <Row label="In Situ" value={d.catheter?.inSitu ? 'Yes' : 'No'} />
                            <Row label="Inserted in Theatre" value={d.catheter?.insertedInTheatre ? 'Yes' : 'No'} />
                            <Row label="Type/Size" value={`${d.catheter?.type || '—'} / ${d.catheter?.size || '—'}`} />
                        </Section>
                    </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 italic text-center">Page 1 of 2 — Intra-Operative Nursing Record</div>
            </div>

            <div className="print:break-before-page mt-8 print:mt-0" />

            {/* ─── PAGE 2 ────────────────────────────────────────────────── */}
            <div className="min-h-screen flex flex-col">
                <div className="grid grid-cols-2 gap-6 flex-1 pt-4">
                    {/* LEFT COLUMN */}
                    <div className="space-y-4">
                        <Section title="8. Skin Preparation">
                            <Row label="Shaved By" value={d.skinPrep?.shavedBy} />
                            <Row label="Prep Agent" value={d.skinPrep?.prepAgent === 'OTHER' ? d.skinPrep.otherPrepAgent : d.skinPrep?.prepAgent} />
                        </Section>

                        <Section title="9. Equipment (Cautery/Tourniquet)">
                            <h4 className="font-bold text-[10px] uppercase border-b border-black/10 mt-1">Electrosurgical</h4>
                            <Row label="Used" value={d.equipment?.electrosurgical?.cauteryUsed ? 'Yes' : 'No'} />
                            {d.equipment?.electrosurgical?.cauteryUsed && (
                                <>
                                    <Row label="Unit No / Mode" value={`${d.equipment.electrosurgical.unitNo || '—'} / ${d.equipment.electrosurgical.mode || '—'}`} />
                                    <Row label="Cut / Coag Settings" value={`${d.equipment.electrosurgical.cutSet || '—'} / ${d.equipment.electrosurgical.coagSet || '—'}`} />
                                    <Row label="Skin Checked (B/A)" value={`${d.equipment.electrosurgical.skinCheckedBefore ? 'Yes' : 'No'} / ${d.equipment.electrosurgical.skinCheckedAfter ? 'Yes' : 'No'}`} />
                                </>
                            )}
                            <h4 className="font-bold text-[10px] uppercase border-b border-black/10 mt-3">Tourniquet</h4>
                            <Row label="Used" value={d.equipment?.tourniquet?.tourniquetUsed ? 'Yes' : 'No'} />
                            {d.equipment?.tourniquet?.tourniquetUsed && (
                                <>
                                    <Row label="Type/Site" value={`${d.equipment.tourniquet.type || '—'} / ${d.equipment.tourniquet.site || '—'} (${d.equipment.tourniquet.laterality || '—'})`} />
                                    <Row label="Pressure" value={d.equipment.tourniquet.pressure} />
                                    <Row label="Time On/Off" value={`${d.equipment.tourniquet.timeOn || '—'} to ${d.equipment.tourniquet.timeOff || '—'}`} />
                                    <Row label="Skin Checked (B/A)" value={`${d.equipment.tourniquet.skinCheckedBefore ? 'Yes' : 'No'} / ${d.equipment.tourniquet.skinCheckedAfter ? 'Yes' : 'No'}`} />
                                </>
                            )}
                        </Section>

                        <Section title="10. Surgical Details">
                            <Row label="Wound Class" value={d.surgicalDetails?.woundClass} />
                            <Row label="Irrigation" value={d.surgicalDetails?.woundIrrigation?.join(', ') || 'None'} />
                            <Row label="Drains" value={d.surgicalDetails?.drainType?.join(', ') || 'None'} />
                            <Row label="Wound Pack" value={`${d.surgicalDetails?.woundPackType || '—'} at ${d.surgicalDetails?.woundPackSite || '—'}`} />
                            <Note label="Intra-Op X-Rays" value={d.surgicalDetails?.intraOpXraysTaken} />
                        </Section>

                        <Section title="11. Closure & Dressing">
                            <Row label="Skin Closure" value={d.closure?.skinClosure} />
                            <Row label="Dressing Applied" value={d.closure?.dressingApplied} />
                        </Section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                        <Section title="12. Instruments & Sharps Count">
                            <table className="w-full text-left text-[10px] border-collapse border border-black/20">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="p-1 border border-black/20">Item</th>
                                        <th className="p-1 border border-black/20 text-center">Prelim</th>
                                        <th className="p-1 border border-black/20 text-center">Closure</th>
                                        <th className="p-1 border border-black/20 text-center">Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(d.counts?.items || []).map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-1 border border-black/20">{item.name}</td>
                                            <td className="p-1 border border-black/20 text-center">{item.preliminary}</td>
                                            <td className="p-1 border border-black/20 text-center">{item.woundClosure}</td>
                                            <td className="p-1 border border-black/20 text-center">{item.final}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Row label="Count Correct?" value={d.counts?.countCorrect ? 'Yes' : 'No'} />
                            {!d.counts?.countCorrect && <Note label="Action Taken" value={d.counts?.actionIfIncorrect} />}
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-black/10">
                                <div>
                                    <span className="block font-bold text-[9px] uppercase">Scrub Nurse</span>
                                    <span className="italic">{d.counts?.scrubNurseSignature || '—'}</span>
                                </div>
                                <div>
                                    <span className="block font-bold text-[9px] uppercase">Circulating Nurse</span>
                                    <span className="italic">{d.counts?.circulatingNurseSignature || '—'}</span>
                                </div>
                            </div>
                        </Section>

                        <Section title="13. Fluids & Transfusions">
                            <Row label="EBL" value={`${d.fluids?.estimatedBloodLossMl || 0} mL`} />
                            <Row label="Urine Output" value={`${d.fluids?.urinaryOutputMl || 0} mL`} />
                            <Row label="Packed Cells" value={`${d.fluids?.bloodTransfusionPackedCellsMl || 0} mL`} />
                            <Row label="Whole Blood" value={`${d.fluids?.bloodTransfusionWholeMl || 0} mL`} />
                            <Row label="IV Fluids Total" value={`${d.fluids?.ivInfusionTotalMl || 0} mL`} />
                        </Section>

                        <Section title="14. Items to Return to Theatre">
                            <p className="text-xs p-2 border border-black/10 rounded font-medium">
                                {d.itemsToReturnToTheatre || 'None'}
                            </p>
                        </Section>
                    </div>
                </div>

                {/* Medications & Other Tables */}
                <div className="mt-6 space-y-4">
                    {d.medications?.length > 0 && (
                        <div className="mt-2">
                            <h4 className="font-bold text-xs uppercase border-b border-black mb-1">Medications</h4>
                            <table className="w-full text-left text-[10px] border-collapse border border-black/20">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-1 border border-black/20">Drug</th>
                                        <th className="p-1 border border-black/20">Route</th>
                                        <th className="p-1 border border-black/20">Time</th>
                                        <th className="p-1 border border-black/20">Sign</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.medications.map((m: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-1 border border-black/20">{m.drug}</td>
                                            <td className="p-1 border border-black/20">{m.route}</td>
                                            <td className="p-1 border border-black/20">{m.time}</td>
                                            <td className="p-1 border border-black/20 font-signature">{m.sign}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {d.implants?.length > 0 && (
                        <div>
                            <h4 className="font-bold text-xs uppercase border-b border-black mb-1">Implants</h4>
                            <table className="w-full text-left text-[10px] border-collapse border border-black/20">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-1 border border-black/20">Item</th>
                                        <th className="p-1 border border-black/20">Lot No</th>
                                        <th className="p-1 border border-black/20">Size</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.implants.map((imp: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-1 border border-black/20">{imp.item}</td>
                                            <td className="p-1 border border-black/20">{imp.lotNo}</td>
                                            <td className="p-1 border border-black/20">{imp.size}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {d.specimens?.length > 0 && (
                        <div>
                            <h4 className="font-bold text-xs uppercase border-b border-black mb-1">Specimens</h4>
                            <table className="w-full text-left text-[10px] border-collapse border border-black/20">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-1 border border-black/20">Type</th>
                                        <th className="p-1 border border-black/20 text-center">Hist</th>
                                        <th className="p-1 border border-black/20 text-center">Cyto</th>
                                        <th className="p-1 border border-black/20 text-center">No Analysis</th>
                                        <th className="p-1 border border-black/20">Disposition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.specimens.map((s: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-1 border border-black/20">{s.type}</td>
                                            <td className="p-1 border border-black/20 text-center">{s.histology ? '✓' : ''}</td>
                                            <td className="p-1 border border-black/20 text-center">{s.cytology ? '✓' : ''}</td>
                                            <td className="p-1 border border-black/20 text-center">{s.notForAnalysis ? '✓' : ''}</td>
                                            <td className="p-1 border border-black/20">{s.disposition}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Signature Footer */}
                <footer className="mt-8 pt-4 border-t-2 border-black flex justify-between items-end text-sm">
                    <div>
                        <p className="font-bold uppercase text-[10px] text-slate-500 mb-1">Electronically Signed By</p>
                        <p className="text-lg font-bold">{record.signed_by?.first_name} {record.signed_by?.last_name}</p>
                        <p className="text-xs text-slate-500 uppercase">Nurse circulator / Final Sign-off</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold">Signed At: {formatDateTime(record.signed_at)}</p>
                        <p className="text-[10px] text-slate-400">Generated: {formatDateTime(new Date())}</p>
                    </div>
                </footer>
                <div className="text-[10px] text-slate-400 mt-2 italic text-center">Page 2 of 2 — Intra-Operative Nursing Record</div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-2">
            <h3 className="font-bold border-b border-black mb-1 uppercase text-xs">{title}</h3>
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start text-[10px]">
            <span className="text-slate-600 font-medium pr-2">{label}:</span>
            <span className="font-bold text-right">{value || '—'}</span>
        </div>
    );
}

function Note({ label, value }: { label: string; value: string | undefined }) {
    if (!value) return null;
    return (
        <div className="mt-1 text-[10px] p-1 bg-slate-50 rounded border border-black/5">
            <span className="font-bold text-slate-700 uppercase">{label}:</span> <span className="italic">{value}</span>
        </div>
    );
}
