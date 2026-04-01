'use client';

/**
 * Intra-Op Record Header
 *
 * Navigation bar, patient info card, title + actions, progress bar.
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft, Printer, User2, ShieldAlert, Lock, Circle,
    CheckCircle2, Save, Loader2, AlertTriangle,
} from 'lucide-react';
import { INTRAOP_SECTIONS } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { formatDoctorName } from './intraOpRecordConfig';

interface IntraOpRecordHeaderProps {
    caseId: string;
    patient: { first_name: string; last_name: string; file_number: string; allergies?: string | null };
    procedureName?: string | null;
    side?: string | null;
    surgeonName?: string | null;
    caseStatus: string;
    isFinalized: boolean;
    isDirty: boolean;
    isSaving: boolean;
    isFinalizing: boolean;
    hasDiscrepancy: boolean;
    sectionCompletion: Record<string, { complete: boolean }>;
    formSignedAt?: string | null;
    onSave: () => void;
    onFinalize: () => void;
}

export function IntraOpRecordHeader({
    caseId, patient, procedureName, side, surgeonName, caseStatus,
    isFinalized, isDirty, isSaving, isFinalizing, hasDiscrepancy,
    sectionCompletion, formSignedAt, onSave, onFinalize,
}: IntraOpRecordHeaderProps) {
    const completedSections = Object.values(sectionCompletion).filter((s: any) => s.complete).length;
    const totalSections = INTRAOP_SECTIONS.length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    return (
        <>
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" asChild>
                    <Link href="/nurse/dashboard">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/nurse/intra-op-cases/${caseId}/record/print`} target="_blank">
                        <Printer className="w-4 h-4 mr-2" /> Print Record
                    </Link>
                </Button>
            </div>

            {/* Patient Header */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
                                <User2 className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {patient.file_number}
                                    {procedureName && ` · ${procedureName}`}
                                    {side && ` (${side})`}
                                    {surgeonName && ` · ${formatDoctorName(surgeonName)}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{caseStatus}</Badge>
                            {isFinalized ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                    <Lock className="h-3 w-3" /> Finalized
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="gap-1">
                                    <Circle className="h-3 w-3" /> Draft
                                </Badge>
                            )}
                        </div>
                    </div>

                    {patient.allergies && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">
                                <strong>Allergies:</strong> {patient.allergies}
                            </p>
                        </div>
                    )}

                    {hasDiscrepancy && !isFinalized && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">
                                <strong>Count Discrepancy:</strong> A swab/instrument/sharps count discrepancy has been flagged. This will block transition to RECOVERY until resolved.
                            </p>
                        </div>
                    )}

                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Record Progress</span>
                            <span className="font-medium">{completedSections}/{totalSections} sections complete</span>
                        </div>
                        <Progress value={progressPercent} className={`h-2 ${progressPercent === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                    </div>

                    {isFinalized && formSignedAt && (
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Finalized on {format(new Date(formSignedAt), 'MMM d, yyyy HH:mm')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Title + Actions */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Intra-Operative Nurse Record</h2>
                {!isFinalized && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving || !isDirty} className="gap-1.5">
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save Draft
                        </Button>
                        <Button size="sm" onClick={onFinalize} disabled={isFinalizing} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                            <Lock className="h-3.5 w-3.5" />
                            Finalize Record
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
