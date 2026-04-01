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
    SKIN_PREP_AGENT_LABELS,
    SKIN_PREP_AREA_LABELS,
    SkinPrepAgent,
    SkinPrepArea,
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

function SkinPrepVal({ value }: { value: unknown }) {
    if (!value || typeof value !== 'object') {
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>&mdash;</span>;
    }
    const sp = value as Record<string, string>;
    const agent = sp.agent in SKIN_PREP_AGENT_LABELS
        ? SKIN_PREP_AGENT_LABELS[sp.agent as SkinPrepAgent] + (sp.agentOther ? ` (${sp.agentOther})` : '')
        : (sp.agent ?? '—');
    const area = sp.area in SKIN_PREP_AREA_LABELS
        ? SKIN_PREP_AREA_LABELS[sp.area as SkinPrepArea] + (sp.areaOther ? ` (${sp.areaOther})` : '')
        : (sp.area ?? '');
    const performer = sp.performerName ? `by ${sp.performerName}` : '';
    return <span>{[agent, area, performer].filter(Boolean).join(' — ')}</span>;
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

    const { patient, surgeon, formResponse, checklistData: d, isFinalized, surgicalCase, clinic } = data;

    const printDate = format(new Date(), 'dd MMM yyyy, HH:mm');
    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
    const surgeonName = surgeon?.user
        ? [surgeon.user.first_name, surgeon.user.last_name].filter(Boolean).join(' ')
        : '—';

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
                            {/* Logo and Clinic Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                {clinic.logo_url && (
                                    <img
                                        src={clinic.logo_url}
                                        alt={clinic.name}
                                        style={{
                                            height: 48,
                                            maxWidth: 200,
                                            objectFit: 'contain',
                                        }}
                                    />
                                )}
                                <div>
                                    <div style={{
                                        fontSize: 20,
                                        fontWeight: 700,
                                        color: clinic.primary_color || '#1e40af',
                                        letterSpacing: '-0.5px',
                                        lineHeight: 1.2,
                                    }}>
                                        {clinic.name}
                                    </div>
                                    {clinic.address && (
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                                            {clinic.address}
                                        </div>
                                    )}
                                    {(clinic.phone || clinic.email) && (
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
                                            {[clinic.phone, clinic.email].filter(Boolean).join(' • ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#475569',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginTop: 4,
                            }}>
                                Pre-Operative Ward Check-List
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
                            ['Patient', patientName],
                            ['File No.', patient.file_number],
                            ['Case ID', surgicalCase.id.slice(0, 8).toUpperCase()],
                            ['DOB', patient.date_of_birth ? format(new Date(patient.date_of_birth), 'dd MMM yyyy') : '—'],
                            ['Surgeon', surgeonName],
                            ['Procedure', surgicalCase.procedure_name ?? '—'],
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

                    {/* Sections */}

                    <SectionTable title="1. Documentation" clinicColor={clinic.primary_color}>
                        <Row label="Documentation complete"><Bool value={doc.documentationComplete as boolean} /></Row>
                        <Row label="Correct consent signed"><Bool value={doc.correctConsent as boolean} /></Row>
                    </SectionTable>

                    <SectionTable title="2. Blood & Lab Results" clinicColor={clinic.primary_color}>
                        <Row label="Hb / PCV"><Val value={labs.hbPcv} /></Row>
                        {labs.hbPcvNotes && <Row label="Hb/PCV Notes"><Val value={labs.hbPcvNotes} /></Row>}
                        <Row label="UECs"><Val value={labs.uecs} /></Row>
                        {labs.uecsNotes && <Row label="UECs Notes"><Val value={labs.uecsNotes} /></Row>}
                        <Row label="X-match units"><Val value={labs.xMatchUnitsAvailable} /></Row>
                        <Row label="Other results"><Val value={labs.otherLabResults} /></Row>
                    </SectionTable>

                    <SectionTable title="3. Medications" clinicColor={clinic.primary_color}>
                        <Row label="Pre-med given"><Bool value={meds.preMedGiven as boolean} /></Row>
                        <Row label="Pre-med details"><Val value={meds.preMedDetails} /></Row>
                        <Row label="Pre-med time"><Val value={meds.preMedTimeGiven} /></Row>
                        <Row label="Peri-op meds given"><Bool value={meds.periOpMedsGiven as boolean} /></Row>
                        <Row label="Peri-op details"><Val value={meds.periOpMedsDetails} /></Row>
                        <Row label="Regular meds given"><Bool value={meds.regularMedsGiven as boolean} /></Row>
                        <Row label="Regular meds details"><Val value={meds.regularMedsDetails} /></Row>
                        <Row label="Regular meds time"><Val value={meds.regularMedsTimeGiven} /></Row>
                    </SectionTable>

                    <SectionTable title="4. Allergies & NPO Status" clinicColor={clinic.primary_color}>
                        <Row label="Allergies documented"><Bool value={allerg.allergiesDocumented as boolean} /></Row>
                        <Row label="Allergy details"><Val value={allerg.allergiesDetails} /></Row>
                        <Row label="NPO status"><Bool value={allerg.npoStatus as boolean} /></Row>
                        <Row label="Fasted from"><Val value={allerg.npoFastedFromTime} /></Row>
                    </SectionTable>

                    <SectionTable title="5. Peri-Operative Preparation" clinicColor={clinic.primary_color}>
                        <Row label="Bath / shower & gown"><Bool value={prep.bathGown as boolean} /></Row>
                        <Row label="Shave / skin prep done"><Bool value={prep.shaveSkinPrep as boolean} /></Row>
                        <Row label="Skin prep details"><SkinPrepVal value={prep.skinPrep} /></Row>
                        <Row label="ID band on"><Bool value={prep.idBandOn as boolean} /></Row>
                        <Row label="Correct positioning"><Bool value={prep.correctPositioning as boolean} /></Row>
                        <Row label="Jewelry removed"><Bool value={prep.jewelryRemoved as boolean} /></Row>
                        <Row label="Makeup / nail polish removed"><Bool value={prep.makeupNailPolishRemoved as boolean} /></Row>
                    </SectionTable>

                    <SectionTable title="6. Prosthetics" clinicColor={clinic.primary_color}>
                        <Row label="Contact lenses removed"><Bool value={pros.contactLensRemoved as boolean} /></Row>
                        <Row label="Dentures removed"><Bool value={pros.denturesRemoved as boolean} /></Row>
                        <Row label="Hearing aid removed"><Bool value={pros.hearingAidRemoved as boolean} /></Row>
                        <Row label="Crowns / bridgework noted"><Bool value={pros.crownsBridgeworkNoted as boolean} /></Row>
                        <Row label="Prosthetic notes"><Val value={pros.prostheticNotes} /></Row>
                    </SectionTable>

                    <SectionTable title="7. Immediate Pre-Op Observations" clinicColor={clinic.primary_color}>
                        <Row label="Blood pressure">{bpStr}</Row>
                        <Row label="Pulse"><Val value={vit.pulse !== undefined ? `${vit.pulse} bpm` : undefined} /></Row>
                        <Row label="Respiratory rate"><Val value={vit.respiratoryRate !== undefined ? `${vit.respiratoryRate} /min` : undefined} /></Row>
                        <Row label="Temperature"><Val value={vit.temperature !== undefined ? `${vit.temperature} °C` : undefined} /></Row>
                        <Row label="SpO₂"><Val value={vit.spo2 !== undefined ? `${vit.spo2}%` : undefined} /></Row>
                        <Row label="Bladder emptied"><Bool value={vit.bladderEmptied as boolean} /></Row>
                        <Row label="Height"><Val value={vit.height !== undefined ? `${vit.height} cm` : undefined} /></Row>
                        <Row label="Weight"><Val value={vit.weight !== undefined ? `${vit.weight} kg` : undefined} /></Row>
                        <Row label="Urinalysis"><UrinalysisVal value={vit.urinalysis} /></Row>
                        <Row label="X-rays / scans present"><Bool value={vit.xRaysScansPresent as boolean} /></Row>
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
                            [
                                'Prepared by',
                                isFinalized && formResponse?.signed_by
                                    ? [formResponse.signed_by.first_name, formResponse.signed_by.last_name].filter(Boolean).join(' ')
                                    : (hand.preparedByName ?? ''),
                            ],
                            [
                                'Date / Time',
                                isFinalized && formResponse?.signed_at
                                    ? format(new Date(formResponse.signed_at), 'dd MMM yyyy HH:mm')
                                    : '',
                            ],
                            ['Signature', ''],
                        ] as [string, string][]).map(([label, val]) => (
                            <div key={label}>
                                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {label}
                                </div>
                                <div style={{ marginTop: 4, fontSize: 11, minHeight: 24 }}>{val}</div>
                                <div style={{ borderTop: '1px solid #111', marginTop: 24, fontSize: 9, color: '#94a3b8' }}>
                                    {label}
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
