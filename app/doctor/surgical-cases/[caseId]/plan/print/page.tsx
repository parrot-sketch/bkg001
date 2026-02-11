'use client';

/**
 * Print-Friendly Surgical Plan Summary
 *
 * Route: /doctor/surgical-cases/[caseId]/plan/print
 *
 * Compiles all surgical plan data into a clean, printable format
 * for internal use and patient charting.
 */

import { useParams, useRouter } from 'next/navigation';
import { useCasePlanDetail } from '@/hooks/doctor/useCasePlan';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, AlertCircle, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { parseImplantData } from '@/domain/helpers/implantTypes';

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

function calculateAge(dob?: string | Date | null): string | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}`;
}

const ANESTHESIA_LABELS: Record<string, string> = {
    GENERAL: 'General Anesthesia',
    REGIONAL: 'Regional Anesthesia',
    LOCAL: 'Local Anesthesia',
    SEDATION: 'Sedation',
    TIVA: 'Total IV Anesthesia (TIVA)',
    MAC: 'Monitored Anesthesia Care (MAC)',
};

export default function PrintPlanPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: detail, isLoading, error } = useCasePlanDetail(caseId);

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto p-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                    {error?.message || 'Case not found'}
                </p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const patient = detail.patient;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
    const age = calculateAge(patient?.dateOfBirth);
    const cp = detail.casePlan;
    const checklist = detail.readinessChecklist ?? [];
    const implants = parseImplantData(cp?.implantDetails ?? null);

    return (
        <>
            {/* Screen-only controls */}
            <div className="print:hidden max-w-3xl mx-auto p-4 flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.back()}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Plan
                </Button>
                <Button size="sm" className="gap-1.5 ml-auto" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" />
                    Print / Export PDF
                </Button>
            </div>

            {/* Printable content */}
            <div className="max-w-3xl mx-auto p-8 print:p-4 space-y-6 text-sm leading-relaxed">
                {/* Header */}
                <div className="border-b-2 border-black pb-4">
                    <h1 className="text-xl font-bold">Surgical Plan Summary</h1>
                    <p className="text-muted-foreground print:text-black mt-1">
                        Generated: {format(new Date(), 'EEEE, MMMM d, yyyy HH:mm')}
                    </p>
                </div>

                {/* Patient Information */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Patient Information</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <div><strong>Name:</strong> {patientName}</div>
                        <div><strong>File #:</strong> {patient?.fileNumber ?? 'N/A'}</div>
                        <div><strong>Gender:</strong> {patient?.gender ?? 'N/A'}</div>
                        <div><strong>Age:</strong> {age ? `${age} years` : 'N/A'}</div>
                        {patient?.allergies && (
                            <div className="col-span-2 mt-1 flex items-center gap-1.5 text-red-700 font-medium">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                Allergies: {patient.allergies}
                            </div>
                        )}
                    </div>
                </section>

                {/* Case Overview */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Case Overview</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <div><strong>Procedure:</strong> {detail.procedureName ?? 'Not specified'}</div>
                        <div><strong>Laterality:</strong> {detail.side ?? 'N/A'}</div>
                        <div><strong>Diagnosis:</strong> {detail.diagnosis ?? 'N/A'}</div>
                        <div><strong>Urgency:</strong> {detail.urgency}</div>
                        <div><strong>Status:</strong> {detail.status}</div>
                        <div><strong>Surgeon:</strong> {detail.primarySurgeon?.name ?? 'N/A'}</div>
                        {cp?.estimatedDurationMinutes && (
                            <div><strong>Est. Duration:</strong> {cp.estimatedDurationMinutes} minutes</div>
                        )}
                        {cp?.anesthesiaPlan && (
                            <div><strong>Anesthesia:</strong> {ANESTHESIA_LABELS[cp.anesthesiaPlan] ?? cp.anesthesiaPlan}</div>
                        )}
                    </div>
                </section>

                {/* Procedure Plan */}
                {cp?.procedurePlan && stripHtml(cp.procedurePlan).length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Procedure Plan</h2>
                        <div
                            className="prose prose-sm max-w-none print:prose-black"
                            dangerouslySetInnerHTML={{ __html: cp.procedurePlan }}
                        />
                    </section>
                )}

                {/* Risk Assessment */}
                {cp?.riskFactors && stripHtml(cp.riskFactors).length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Risk Assessment</h2>
                        <div
                            className="prose prose-sm max-w-none print:prose-black"
                            dangerouslySetInnerHTML={{ __html: cp.riskFactors }}
                        />
                    </section>
                )}

                {/* Pre-Op Notes */}
                {cp?.preOpNotes && stripHtml(cp.preOpNotes).length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Pre-Operative Notes</h2>
                        <div
                            className="prose prose-sm max-w-none print:prose-black"
                            dangerouslySetInnerHTML={{ __html: cp.preOpNotes }}
                        />
                    </section>
                )}

                {/* Special Instructions */}
                {cp?.specialInstructions && stripHtml(cp.specialInstructions).length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Special Instructions</h2>
                        <div
                            className="prose prose-sm max-w-none print:prose-black"
                            dangerouslySetInnerHTML={{ __html: cp.specialInstructions }}
                        />
                    </section>
                )}

                {/* Implants/Devices */}
                {implants.items.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Implants / Devices ({implants.items.length})
                        </h2>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1.5 pr-2 font-semibold">#</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Name</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Manufacturer</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Lot #</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Serial #</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Size</th>
                                    <th className="text-left py-1.5 font-semibold">Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {implants.items.map((item, idx) => (
                                    <tr key={item.id} className="border-b border-dotted">
                                        <td className="py-1.5 pr-2">{idx + 1}</td>
                                        <td className="py-1.5 pr-2">{item.name || '—'}</td>
                                        <td className="py-1.5 pr-2">{item.manufacturer || '—'}</td>
                                        <td className="py-1.5 pr-2 font-mono">{item.lotNumber || '—'}</td>
                                        <td className="py-1.5 pr-2 font-mono">{item.serialNumber || '—'}</td>
                                        <td className="py-1.5 pr-2">{item.size || '—'}</td>
                                        <td className="py-1.5">{item.expiryDate ? format(new Date(item.expiryDate), 'MMM d, yyyy') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* Consents */}
                {cp && cp.consents.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Consent Forms ({cp.consents.length})
                        </h2>
                        <div className="space-y-1">
                            {cp.consents.map((c) => (
                                <div key={c.id} className="flex items-center justify-between py-1 border-b border-dotted">
                                    <span>{c.title}</span>
                                    <span className={c.status === 'SIGNED' ? 'text-emerald-700 font-medium' : 'text-amber-600'}>
                                        {c.status === 'SIGNED'
                                            ? `✓ Signed ${c.signedAt ? format(new Date(c.signedAt), 'MMM d, yyyy') : ''}`
                                            : c.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Photos */}
                {cp && cp.images.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Clinical Photos ({cp.images.length})
                        </h2>
                        <div className="space-y-1">
                            {cp.images.map((img) => (
                                <div key={img.id} className="flex items-center justify-between py-1 border-b border-dotted">
                                    <span>{img.angle ?? 'Photo'} — {img.timepoint}</span>
                                    <span className="text-muted-foreground print:text-black">
                                        {img.takenAt ? format(new Date(img.takenAt), 'MMM d, yyyy') : 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Team */}
                {cp?.procedureRecord?.staff && cp.procedureRecord.staff.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Surgical Team ({cp.procedureRecord.staff.length})
                        </h2>
                        <div className="space-y-1">
                            {cp.procedureRecord.staff.map((s) => (
                                <div key={s.id} className="flex items-center justify-between py-1 border-b border-dotted">
                                    <span>
                                        {s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unassigned'}
                                    </span>
                                    <span className="font-medium text-xs uppercase tracking-wide">
                                        {s.role.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Theater Booking */}
                {detail.theaterBooking && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Theater Booking</h2>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                            <div><strong>Date:</strong> {format(new Date(detail.theaterBooking.startTime), 'EEEE, MMMM d, yyyy')}</div>
                            <div><strong>Time:</strong> {format(new Date(detail.theaterBooking.startTime), 'HH:mm')} — {format(new Date(detail.theaterBooking.endTime), 'HH:mm')}</div>
                            {detail.theaterBooking.theaterName && (
                                <div><strong>Theater:</strong> {detail.theaterBooking.theaterName}</div>
                            )}
                            <div><strong>Status:</strong> {detail.theaterBooking.status}</div>
                        </div>
                    </section>
                )}

                {/* Readiness Checklist */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Readiness Checklist</h2>
                    <div className="space-y-1.5">
                        {checklist.map(item => (
                            <div key={item.key} className="flex items-center gap-2">
                                {item.done ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className={item.done ? 'text-emerald-700' : 'text-red-600'}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer */}
                <div className="border-t-2 border-black pt-4 mt-8 text-xs text-muted-foreground print:text-black">
                    <div className="flex justify-between">
                        <span>Case ID: {caseId}</span>
                        <span>Printed: {format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                    <p className="mt-2 italic">
                        This document is for internal clinical use only. Protected health information.
                    </p>
                </div>
            </div>
        </>
    );
}
