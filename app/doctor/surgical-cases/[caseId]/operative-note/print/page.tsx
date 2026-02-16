'use client';

/**
 * Print-Friendly Operative Note Summary
 *
 * Route: /doctor/surgical-cases/[caseId]/operative-note/print
 *
 * Clean, structured printable operative note for charting and records.
 * Includes all sections, timeline summary, implant/specimen tables,
 * signature, and timestamps.
 */

import { useParams, useRouter } from 'next/navigation';
import { useOperativeNote } from '@/hooks/doctor/useOperativeNote';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const ANESTHESIA_LABELS: Record<string, string> = {
    GENERAL: 'General Anesthesia',
    REGIONAL: 'Regional Anesthesia',
    LOCAL: 'Local Anesthesia',
    SEDATION: 'Sedation',
    TIVA: 'Total IV Anesthesia (TIVA)',
    MAC: 'Monitored Anesthesia Care (MAC)',
};

const DESTINATION_LABELS: Record<string, string> = {
    WARD: 'Ward',
    HOME: 'Home',
    ICU: 'ICU',
    HDU: 'HDU',
    OTHER: 'Other',
};

export default function PrintOperativeNotePage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data, isLoading, error } = useOperativeNote(caseId);

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

    if (error || !data || !data.form) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                    {error?.message || 'Operative note not found'}
                </p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const form = data.form;
    const noteData = form.data;
    const patient = data.patient;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
    const header = noteData.header ?? {};
    const findingsAndSteps = noteData.findingsAndSteps ?? {};
    const metrics = noteData.intraOpMetrics ?? {};
    const implants = noteData.implantsUsed?.implantsUsed ?? [];
    const specimens = noteData.specimens?.specimens ?? [];
    const complications = noteData.complications ?? {};
    const counts = noteData.countsConfirmation ?? {};
    const postOp = noteData.postOpPlan ?? {};

    return (
        <>
            {/* Screen-only controls */}
            <div className="print:hidden max-w-3xl mx-auto p-4 flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.back()}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Note
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
                    <h1 className="text-xl font-bold">Surgeon Operative Note</h1>
                    <p className="text-muted-foreground print:text-black mt-1">
                        {form.status === 'FINAL' ? (
                            <>Finalized: {form.signedAt ? format(new Date(form.signedAt), 'EEEE, MMMM d, yyyy HH:mm') : 'N/A'}</>
                        ) : (
                            <>Draft — Generated: {format(new Date(), 'EEEE, MMMM d, yyyy HH:mm')}</>
                        )}
                    </p>
                    {form.status !== 'FINAL' && (
                        <p className="text-red-600 font-bold mt-1 text-xs uppercase tracking-wide">
                            ⚠ DRAFT — NOT YET FINALIZED
                        </p>
                    )}
                </div>

                {/* Patient Information */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Patient Information</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <div><strong>Name:</strong> {patientName}</div>
                        <div><strong>File #:</strong> {patient?.file_number ?? 'N/A'}</div>
                        {patient?.allergies && (
                            <div className="col-span-2 mt-1 flex items-center gap-1.5 text-red-700 font-medium">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                Allergies: {patient.allergies}
                            </div>
                        )}
                    </div>
                </section>

                {/* Case Details */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Case Details</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <div><strong>Pre-Op Diagnosis:</strong> {header.diagnosisPreOp || 'N/A'}</div>
                        <div><strong>Post-Op Diagnosis:</strong> {header.diagnosisPostOp || 'Same as pre-op'}</div>
                        <div><strong>Procedure Performed:</strong> {header.procedurePerformed || 'N/A'}</div>
                        <div><strong>Laterality:</strong> {header.side || 'N/A'}</div>
                        <div><strong>Surgeon:</strong> {header.surgeonName || 'N/A'}</div>
                        <div><strong>Anesthesia:</strong> {(header.anesthesiaType ? ANESTHESIA_LABELS[header.anesthesiaType] : undefined) ?? header.anesthesiaType ?? 'N/A'}</div>
                    </div>
                    {header.assistants && header.assistants.length > 0 && (
                        <div className="mt-2">
                            <strong>Assistants:</strong>{' '}
                            {header.assistants.map((a: any) => `${a.name}${a.role ? ` (${a.role.replace(/_/g, ' ')})` : ''}`).join(', ')}
                        </div>
                    )}
                </section>

                {/* Findings */}
                {findingsAndSteps.findings && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Intra-Operative Findings</h2>
                        <p className="whitespace-pre-wrap">{findingsAndSteps.findings}</p>
                    </section>
                )}

                {/* Operative Steps */}
                {findingsAndSteps.operativeSteps && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">Operative Steps / Description</h2>
                        <p className="whitespace-pre-wrap">{findingsAndSteps.operativeSteps}</p>
                    </section>
                )}

                {/* Intra-Op Metrics */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Intra-Operative Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1">
                        <div><strong>EBL:</strong> {metrics.estimatedBloodLossMl != null ? `${metrics.estimatedBloodLossMl} mL` : 'N/A'}</div>
                        <div><strong>Fluids Given:</strong> {metrics.fluidsGivenMl != null ? `${metrics.fluidsGivenMl} mL` : 'N/A'}</div>
                        <div><strong>Urine Output:</strong> {metrics.urineOutputMl != null ? `${metrics.urineOutputMl} mL` : 'N/A'}</div>
                        <div><strong>Tourniquet:</strong> {metrics.tourniquetTimeMinutes != null ? `${metrics.tourniquetTimeMinutes} min` : 'N/A'}</div>
                    </div>
                </section>

                {/* Implants */}
                {implants.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Implants Used ({implants.length})
                        </h2>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1.5 pr-2 font-semibold">#</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Name</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Manufacturer</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Lot #</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Serial #</th>
                                    <th className="text-left py-1.5 font-semibold">Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {implants.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-dotted">
                                        <td className="py-1.5 pr-2">{idx + 1}</td>
                                        <td className="py-1.5 pr-2">{item.name || '—'}</td>
                                        <td className="py-1.5 pr-2">{item.manufacturer || '—'}</td>
                                        <td className="py-1.5 pr-2 font-mono">{item.lotNumber || '—'}</td>
                                        <td className="py-1.5 pr-2 font-mono">{item.serialNumber || '—'}</td>
                                        <td className="py-1.5">{item.expiryDate || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* Specimens */}
                {specimens.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b pb-1 mb-3">
                            Specimens ({specimens.length})
                        </h2>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1.5 pr-2 font-semibold">#</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Type</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Site</th>
                                    <th className="text-left py-1.5 pr-2 font-semibold">Destination Lab</th>
                                    <th className="text-left py-1.5 font-semibold">Time Sent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {specimens.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-dotted">
                                        <td className="py-1.5 pr-2">{idx + 1}</td>
                                        <td className="py-1.5 pr-2">{item.type || '—'}</td>
                                        <td className="py-1.5 pr-2">{item.site || '—'}</td>
                                        <td className="py-1.5 pr-2">{item.destinationLab || '—'}</td>
                                        <td className="py-1.5">{item.timeSent || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* Complications */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Complications</h2>
                    {complications.complicationsOccurred ? (
                        <div>
                            <p className="text-red-700 font-medium">Complications occurred</p>
                            <p className="mt-1 whitespace-pre-wrap">{complications.complicationsDetails || 'No details provided'}</p>
                        </div>
                    ) : (
                        <p className="text-emerald-700">No complications</p>
                    )}
                </section>

                {/* Counts Confirmation */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Counts Confirmation</h2>
                    {counts.countsCorrect ? (
                        <p className="text-emerald-700 font-medium">All counts confirmed correct</p>
                    ) : (
                        <div>
                            <p className="text-red-700 font-medium">Counts not confirmed correct</p>
                            {data.nurseHasDiscrepancy && (
                                <p className="text-red-600 text-xs mt-0.5">Nurse intra-op record flagged count discrepancy</p>
                            )}
                            {counts.countsExplanation && (
                                <p className="mt-1 whitespace-pre-wrap">{counts.countsExplanation}</p>
                            )}
                        </div>
                    )}
                </section>

                {/* Post-Op Plan */}
                <section>
                    <h2 className="text-base font-bold border-b pb-1 mb-3">Post-Operative Plan</h2>
                    <div className="space-y-2">
                        {postOp.dressingInstructions && (
                            <div><strong>Dressings:</strong> {postOp.dressingInstructions}</div>
                        )}
                        {postOp.drainCare && (
                            <div><strong>Drain Care:</strong> {postOp.drainCare}</div>
                        )}
                        {postOp.meds && (
                            <div><strong>Medications:</strong> {postOp.meds}</div>
                        )}
                        {postOp.followUpPlan && (
                            <div><strong>Follow-Up:</strong> {postOp.followUpPlan}</div>
                        )}
                        {postOp.dischargeDestination && (
                            <div><strong>Discharge Destination:</strong> {DESTINATION_LABELS[postOp.dischargeDestination] ?? postOp.dischargeDestination}</div>
                        )}
                        {!postOp.dressingInstructions && !postOp.drainCare && !postOp.meds && !postOp.followUpPlan && !postOp.dischargeDestination && (
                            <p className="text-muted-foreground italic">No post-op plan documented</p>
                        )}
                    </div>
                </section>

                {/* Signature */}
                <section className="border-t-2 border-black pt-4 mt-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs text-muted-foreground print:text-black mb-8">Surgeon Signature</p>
                            <div className="border-b border-black" />
                            <p className="text-xs mt-1">{header.surgeonName || 'Surgeon'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground print:text-black mb-8">Date & Time</p>
                            <div className="border-b border-black" />
                            <p className="text-xs mt-1">
                                {form.signedAt ? format(new Date(form.signedAt), 'yyyy-MM-dd HH:mm') : '________________'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className="border-t border-slate-300 pt-3 mt-6 text-xs text-muted-foreground print:text-black">
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
