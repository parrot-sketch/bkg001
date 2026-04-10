'use client';

import Link from 'next/link';
import { User2, Printer, FilePen, Lock, Circle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PatientHeaderProps {
    caseId: string;
    patient: {
        first_name: string;
        last_name: string;
        file_number: string;
        allergies?: string | null;
    };
    procedureName?: string | null;
    side?: string | null;
    surgeonName?: string | null;
    formStatus?: string;
    sectionCompletion?: Record<string, { complete: boolean }>;
    isFinalized: boolean;
    isAmendment: boolean;
    signedAt?: Date | null;
}

function formatDoctorName(name: string | null | undefined): string {
    if (!name) return '';
    return name.match(/^(Dr\.?|Dr\s)/i) ? name : `Dr. ${name}`;
}

export function PatientHeader({
    caseId,
    patient,
    procedureName,
    side,
    surgeonName,
    formStatus,
    sectionCompletion = {},
    isFinalized,
    isAmendment,
    signedAt,
}: PatientHeaderProps) {
    const totalSections = 8;
    const completedSections = Object.values(sectionCompletion).filter((s: any) => s.complete).length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <User2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">
                                {patient.first_name} {patient.last_name}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {patient.file_number} · {procedureName || 'Procedure TBD'}
                                {side && ` (${side})`}
                                {surgeonName && ` · ${formatDoctorName(surgeonName)}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isFinalized ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                <Lock className="h-3 w-3" />
                                Finalized
                            </Badge>
                        ) : isAmendment ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                                <FilePen className="h-3 w-3" />
                                Amendment
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="gap-1">
                                <Circle className="h-3 w-3" />
                                Draft
                            </Badge>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8"
                            asChild
                        >
                            <a
                                href={`/nurse/ward-prep/${caseId}/checklist/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                            </a>
                        </Button>
                        {isFinalized && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                                <FilePen className="h-3.5 w-3.5" />
                                Amend
                            </Button>
                        )}
                    </div>
                </div>

                {isAmendment && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <FilePen className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            <strong>Amendment in Progress</strong> — This record was previously finalized.
                            Make your corrections and re-finalize when ready.
                        </p>
                    </div>
                )}

                {patient.allergies && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            <strong>Allergies:</strong> {patient.allergies}
                        </p>
                    </div>
                )}

                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Checklist Progress</span>
                        <span className="font-medium">
                            {completedSections}/{totalSections} sections complete
                        </span>
                    </div>
                    <div className={`h-2 rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div
                            className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {isFinalized && signedAt && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 h-3.5 text-emerald-500" />
                        Finalized on {format(new Date(signedAt), 'MMM d, yyyy HH:mm')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}