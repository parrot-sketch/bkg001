/**
 * Nurse Pre-Op Ward Checklist — Branded Print View
 *
 * Lives in the (print) route group to escape the nurse sidebar layout.
 * The root layout (app/layout.tsx) still provides <html><body>.
 *
 * URL: /nurse/ward-prep/[id]/checklist/print
 * Query: ?autoprint=1  → triggers window.print() on load
 */

import { notFound } from 'next/navigation';
import db from '@/lib/db';
import {
    UrinalysisResult,
    URINALYSIS_LABELS,
    normalizeLegacyChecklistData,
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { format } from 'date-fns';
import { AutoPrint, PrintButton } from './AutoPrint';

// ──────────────────────────────────────────────────────────────────────
// Data Fetching
// ──────────────────────────────────────────────────────────────────────

async function getChecklistPrintData(caseId: string) {
    const surgicalCase = await db.surgicalCase.findUnique({
        where: { id: caseId },
        include: {
            patient: true,
            primary_surgeon: {
                include: { user: true },
            },
            staff_invites: {
                include: { invited_user: { select: { first_name: true, last_name: true } } },
            },
            clinical_forms: {
                where: { template_key: 'NURSE_PREOP_WARD_CHECKLIST' },
                include: { signed_by: true },
                orderBy: { updated_at: 'desc' },
                take: 1,
            },
        },
    });

    if (!surgicalCase) return null;

    // Fetch clinic branding information
    const clinic = await db.clinic.findFirst({
        orderBy: { created_at: 'asc' },
    });

    const formResponse = surgicalCase.clinical_forms[0] ?? null;
    const rawData = formResponse?.data_json
        ? (() => { try { return JSON.parse(formResponse.data_json); } catch { return {}; } })()
        : {};
    const checklistData = normalizeLegacyChecklistData(rawData) as NursePreopWardChecklistDraft;

    return {
        surgicalCase,
        patient: surgicalCase.patient,
        surgeon: surgicalCase.primary_surgeon,
        staffInvites: surgicalCase.staff_invites,
        formResponse,
        checklistData,
        isFinalized: formResponse?.status === 'FINAL',
        clinic: clinic || {
            name: 'Nairobi Sculpt Surgical Aesthetic Center',
            logo_url: null,
            address: null,
            phone: null,
            email: null,
            website: null,
            primary_color: '#1e40af',
            accent_color: null,
        },
    };
}

// ──────────────────────────────────────────────────────────────────────
// Helper renderers
// ──────────────────────────────────────────────────────────────────────

function getAgeYears(dateOfBirth?: string | Date | null): string {
    if (!dateOfBirth) return '—';
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (Number.isNaN(dob.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    if (age < 0) return '—';
    return `${age}`;
}

function formatSex(gender?: string | null) {
    if (!gender) return '—';
    return gender.toUpperCase().startsWith('M') ? 'M' : gender.toUpperCase().startsWith('F') ? 'F' : gender;
}

function getInviteDisplayName(invite: any): string {
    const userName = invite?.invited_user
        ? `${invite.invited_user.first_name || ''} ${invite.invited_user.last_name || ''}`.trim()
        : '';
    return userName || invite?.external_name || '—';
}

function getAnaesthesiologistName(invites: any[] | undefined): string {
    if (!invites?.length) return '—';
    const matchesRole = (i: any) => i?.invited_role === 'ANESTHESIOLOGIST' || i?.invited_role === 'ANESTHETIST_NURSE';
    const ana = invites.find((i) => matchesRole(i) && i.status === 'ACCEPTED') || invites.find((i) => matchesRole(i));
    if (!ana) return '—';
    return getInviteDisplayName(ana);
}

function Bool({ value }: { value: boolean | undefined }) {
    if (value === true) return <span style={{ fontWeight: 600, color: '#166534' }}>&#10003; Yes</span>;
    if (value === false) return <span style={{ color: '#6b7280' }}>&#10007; No</span>;
    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>&mdash;</span>;
}

function Val({ value }: { value: unknown }) {
    if (value === undefined || value === null || value === '') {
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>&mdash;</span>;
    }
    return <span>{String(value)}</span>;
}

function UrinalysisVal({ value }: { value: unknown }) {
    if (!value) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>&mdash;</span>;
    if (typeof value === 'string' && value in URINALYSIS_LABELS) {
        return <span>{URINALYSIS_LABELS[value as UrinalysisResult]}</span>;
    }
    if (typeof value === 'object' && value !== null && 'custom' in value) {
        return <span>{(value as { custom: string }).custom}</span>;
    }
    return <span>{String(value)}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{
                padding: '6px 12px 6px 0',
                fontSize: 11,
                fontWeight: 500,
                color: '#475569',
                width: 220,
                verticalAlign: 'top',
            }}>
                {label}
            </td>
            <td style={{
                padding: '6px 0',
                fontSize: 11,
                color: '#111827',
                verticalAlign: 'top',
                lineHeight: 1.5,
            }}>
                {children}
            </td>
        </tr>
    );
}

function SectionTable({ title, children, clinicColor }: { title: string; children: React.ReactNode; clinicColor?: string | null }) {
    return (
        <div style={{ marginBottom: 20 }} className="avoid-break">
            <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: clinicColor || '#1e40af',
                borderBottom: `2px solid ${clinicColor || '#1e40af'}`,
                paddingBottom: 4,
                marginBottom: 8,
            }}>
                {title}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Print Page
// ──────────────────────────────────────────────────────────────────────

export default async function ChecklistPrintPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ autoprint?: string }>;
}) {
    const { id: caseId } = await params;
    const { autoprint: autoprintParam } = await searchParams;
    const data = await getChecklistPrintData(caseId);
    if (!data) notFound();

    const { patient, surgeon, staffInvites, formResponse, checklistData: d, isFinalized, clinic } = data as any;

    const printDate = format(new Date(), 'dd MMM yyyy, HH:mm');
    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
    const surgeonName = surgeon?.user
        ? [surgeon.user.first_name, surgeon.user.last_name].filter(Boolean).join(' ')
        : '—';
    const anaesthName = getAnaesthesiologistName(staffInvites);

    const header = (d as any).header ?? {};
    const headerDate =
        (typeof header.date === 'string' && header.date.trim().length >= 10)
            ? header.date
            : (formResponse?.signed_at ? format(new Date(formResponse.signed_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const doc = d.documentation ?? {};
    const labs = d.bloodResults ?? {};
    const meds = d.medications ?? {};
    const allerg = d.allergiesNpo ?? {};
    const prep = d.preparation ?? {};
    const pros = d.prosthetics ?? {};
    const vit = d.vitals ?? {};
    const hand = d.handover ?? {};

    const bpStr = vit.bpSystolic && vit.bpDiastolic
        ? `${vit.bpSystolic}/${vit.bpDiastolic} mmHg`
        : '—';

    return (
        <>
            {/* Print-specific global CSS injected into <head> via Next.js */}
            <style>{`
                @media print {
                    body > *:not(#print-root) { display: none !important; }
                    #print-root { display: block !important; }
                    .no-print { display: none !important; }
                    @page {
                        size: A4;
                        margin: 1.5cm 1.2cm;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .avoid-break {
                        page-break-inside: avoid;
                    }
                }
                .watermark {
                    position: fixed; top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    font-size: 80px; font-weight: 900;
                    color: rgba(0,0,0,0.04);
                    pointer-events: none; z-index: 0; white-space: nowrap;
                }
            `}</style>

            {autoprintParam === '1' && <AutoPrint />}

            {/* Full-page white overlay that hides the nurse shell visually */}
            <div
                id="print-root"
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: '#fff', overflowY: 'auto',
                    fontFamily: 'Arial, sans-serif', fontSize: 11,
                }}
            >
                {!isFinalized && <div className="watermark">DRAFT</div>}

                <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, position: 'relative', zIndex: 1 }}>

                    {/* Professional Header with Logo */}
                    <div style={{ 
                        borderBottom: `3px solid ${clinic.primary_color || '#1e40af'}`,
                        paddingBottom: 16,
                        marginBottom: 20,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                    }}>
                        <div style={{ flex: 1 }}>
                            {/* Facility + title (paper-accurate) */}
                            <div style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                lineHeight: 1.2,
                            }}>
                                NAIROBI SCULPT AESTHETIC CENTRE
                            </div>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginTop: 6,
                            }}>
                                PRE-OPERATIVE WARD CHECK-LIST
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 6, lineHeight: 1.4 }}>
                                All information should be filled in clearly before the patient is received in theatre
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 120 }}>
                            <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '4px 12px',
                                borderRadius: 4,
                                display: 'inline-block',
                                ...(isFinalized
                                    ? { background: '#d1fae5', color: '#065f46', border: '1px solid #34d399' }
                                    : { background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }),
                            }}>
                                {isFinalized ? 'FINALIZED' : 'DRAFT'}
                            </span>
                            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
                                Printed: {printDate}
                            </div>
                        </div>
                    </div>

                    {/* Case Info Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        background: '#f8fafc',
                        border: `1px solid ${clinic.primary_color || '#1e40af'}`,
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 24,
                    }} className="avoid-break">
                        {([
                            ['PATIENT FILE NO.', patient.file_number],
                            ['NAME', patientName],
                            ['AGE', getAgeYears(patient.date_of_birth)],
                            ['SEX', formatSex(patient.gender)],
                            ['DATE', headerDate],
                            ['DOCTOR', surgeonName ? `Dr. ${surgeonName}` : '—'],
                            ['ANAESTHESIOLOGIST', anaesthName],
                        ] as [string, string | null][]).map(([label, val]) => (
                            <div key={label}>
                                <div style={{
                                    fontSize: 9,
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    color: clinic.primary_color || '#1e40af',
                                    letterSpacing: '0.05em',
                                    marginBottom: 2,
                                }}>
                                    {label}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                                    {val ?? '—'}
                                </div>
                            </div>
                        ))}
                    </div>

                    <SectionTable title="Nursing: Action / Comments / Observations" clinicColor={clinic.primary_color}>
                        <Row label="Nursing comments"><Val value={header.nursingComments} /></Row>
                    </SectionTable>

                    {/* Sections */}

                    <SectionTable title="1. Documentation" clinicColor={clinic.primary_color}>
                        <Row label="Ward checklist"><Bool value={doc.wardChecklist as boolean} /></Row>
                        <Row label="Documentation complete"><Bool value={doc.documentationComplete as boolean} /></Row>
                        <Row label="Correct consent signed"><Bool value={doc.correctConsent as boolean} /></Row>
                    </SectionTable>

                    <SectionTable title="2. Blood & Lab Results" clinicColor={clinic.primary_color}>
                        <Row label="Blood/results checked"><Bool value={labs.bloodResultsChecked as boolean} /></Row>
                        <Row label="Hb"><Val value={(labs as any).hb} /></Row>
                        <Row label="UECs"><Val value={labs.uecs} /></Row>
                        <Row label="X-match units"><Val value={labs.xMatchUnitsAvailable} /></Row>
                    </SectionTable>

                    <SectionTable title="3. Medications" clinicColor={clinic.primary_color}>
                        <Row label="Pre-medication given"><Bool value={meds.preMedGiven as boolean} /></Row>
                        <Row label="Pre-medication time given"><Val value={meds.preMedTimeGiven} /></Row>
                        <Row label="Pre-medication"><Val value={meds.preMedicationText} /></Row>
                        <Row label="Peri-operative medication given"><Bool value={meds.periOpMedsGiven as boolean} /></Row>
                        <Row label="Peri-operative time given"><Val value={(meds as any).periOpMedsTimeGiven} /></Row>
                        <Row label="Peri-operative medication"><Val value={meds.periOpMedicationText} /></Row>
                        <Row label="Regular medication (specify)"><Val value={meds.regularMedicationText} /></Row>
                    </SectionTable>

                    <SectionTable title="4. Allergies & NPO Status" clinicColor={clinic.primary_color}>
                        <Row label="Allergies documented"><Bool value={allerg.allergiesDocumented as boolean} /></Row>
                        <Row label="6. ALLERGIES (STATE IN RED)"><span className="allergy-text" style={{ color: '#b91c1c', fontWeight: 700, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><Val value={allerg.allergiesDetails} /></span></Row>
                        <Row label="NPO status"><Bool value={allerg.npoStatus as boolean} /></Row>
                        <Row label="Fasted from"><Val value={allerg.npoFastedFromTime} /></Row>
                    </SectionTable>

                    <SectionTable title="5. Peri-Operative Preparation" clinicColor={clinic.primary_color}>
                        <Row label="Bath / shower & gown"><Bool value={prep.bathGown as boolean} /></Row>
                        <Row label="Shave / skin prep done"><Bool value={prep.shaveSkinPrep as boolean} /></Row>
                        <Row label="ID band on"><Bool value={prep.idBandOn as boolean} /></Row>
                        <Row label="Correct positioning"><Bool value={prep.correctPositioning as boolean} /></Row>
                        <Row label="Jewelry removed"><Bool value={prep.jewelryRemoved as boolean} /></Row>
                        <Row label="Makeup / nail polish removed"><Bool value={prep.makeupNailPolishRemoved as boolean} /></Row>
                    </SectionTable>

                    <SectionTable title="6. Prosthetics" clinicColor={clinic.primary_color}>
                        <Row label="Contact lenses removed"><Bool value={pros.contactLensRemoved as boolean} /></Row>
                        <Row label="Dentures removed"><Bool value={pros.denturesRemoved as boolean} /></Row>
                        <Row label="Hearing Aid/Limbs"><Bool value={pros.limbsProsthesisNoted as boolean} /></Row>
                        <Row label="Crowns / bridgework noted"><Bool value={pros.crownsBridgeworkNoted as boolean} /></Row>
                        <Row label="Prosthetic notes"><Val value={pros.prostheticNotes} /></Row>
                    </SectionTable>

                    <SectionTable title="7. Immediate Pre-Op Observations" clinicColor={clinic.primary_color}>
                        <Row label="Blood pressure">{bpStr}</Row>
                        <Row label="Pulse"><Val value={vit.pulse !== undefined ? `${vit.pulse} bpm` : undefined} /></Row>
                        <Row label="Respiratory rate"><Val value={vit.respiratoryRate !== undefined ? `${vit.respiratoryRate} /min` : undefined} /></Row>
                        <Row label="CVP"><Val value={vit.cvp} /></Row>
                        <Row label="Temperature"><Val value={vit.temperature !== undefined ? `${vit.temperature} °C` : undefined} /></Row>
                        <Row label="SpO₂"><Val value={vit.spo2 !== undefined ? `${vit.spo2}%` : undefined} /></Row>
                        <Row label="Bladder emptied"><Bool value={vit.bladderEmptied as boolean} /></Row>
                        <Row label="Foetal heart rate"><Val value={vit.foetalHeartRate !== undefined ? `${vit.foetalHeartRate} bpm` : undefined} /></Row>
                        <Row label="Foetal heart rate notes"><Val value={vit.foetalHeartRateNotes} /></Row>
                        <Row label="Height"><Val value={vit.height !== undefined ? `${vit.height} cm` : undefined} /></Row>
                        <Row label="Weight"><Val value={vit.weight !== undefined ? `${vit.weight} kg` : undefined} /></Row>
                        <Row label="Urinalysis done"><Bool value={vit.urinalysisDone as boolean} /></Row>
                        <Row label="Urinalysis"><UrinalysisVal value={vit.urinalysis} /></Row>
                        <Row label="Other forms"><Val value={vit.otherFormsRequired} /></Row>
                    </SectionTable>

                    <SectionTable title="8. Handover" clinicColor={clinic.primary_color}>
                        <Row label="Prepared by"><Val value={hand.preparedByName} /></Row>
                        <Row label="Time arrived in theatre"><Val value={hand.timeArrivedInTheatre} /></Row>
                        <Row label="Received by"><Val value={hand.receivedByName} /></Row>
                        <Row label="Handed over by"><Val value={hand.handedOverByName} /></Row>
                    </SectionTable>

                    {/* Signature Block */}
                    <div style={{
                        marginTop: 32,
                        borderTop: `2px solid ${clinic.primary_color || '#1e40af'}`,
                        paddingTop: 16,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 24,
                    }} className="avoid-break">
                        {([
                            { label: 'Prepared by', name: hand.preparedByName, sig: hand.preparedBySignature?.signatureDataUrl },
                            { label: 'Received by', name: hand.receivedByName, sig: hand.receivedBySignature?.signatureDataUrl },
                            { label: 'Handed over by', name: hand.handedOverByName, sig: hand.handedOverBySignature?.signatureDataUrl },
                        ] as Array<{ label: string; name: string; sig?: string }>).map((item) => (
                            <div key={item.label}>
                                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {item.label}
                                </div>
                                <div style={{ marginTop: 4, fontSize: 11, minHeight: 18 }}>{item.name || ''}</div>
                                <div style={{ marginTop: 6, minHeight: 48 }}>
                                    {item.sig ? (
                                        <img src={item.sig} alt={`${item.label} signature`} style={{ height: 46, width: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ height: 46 }} />
                                    )}
                                </div>
                                <div style={{ borderTop: '1px solid #111', marginTop: 8, fontSize: 9, color: '#94a3b8' }}>
                                    Signature
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Print button — client component (onClick not allowed in RSC) */}
                <PrintButton />
            </div>
        </>
    );
}
