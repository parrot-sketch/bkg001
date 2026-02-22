/**
 * PatientMedicalInfoPanel Component
 * 
 * Displays patient medical information (allergies, conditions, history).
 * Read-only for frontdesk, editable for clinical staff.
 */

'use client';

import {
    AlertTriangle,
    Heart,
    FileText,
    Info,
    Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientMedicalInfoPanelProps {
    allergies?: string | null;
    medicalConditions?: string | null;
    medicalHistory?: string | null;
    readOnly?: boolean; // If true, shows read-only badge
}

export function PatientMedicalInfoPanel({
    allergies,
    medicalConditions,
    medicalHistory,
    readOnly = true,
}: PatientMedicalInfoPanelProps) {
    const hasAllergies = !!allergies && allergies.trim().length > 0;
    const hasConditions = !!medicalConditions && medicalConditions.trim().length > 0;
    const hasHistory = !!medicalHistory && medicalHistory.trim().length > 0;
    const hasAnyMedicalInfo = hasAllergies || hasConditions || hasHistory;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Heart size={16} className="text-primary" />
                        Medical Information
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Patient-reported medical information
                    </p>
                </div>
                {readOnly && (
                    <Badge variant="outline" className="text-xs">
                        <Shield size={12} className="mr-1" />
                        Read Only
                    </Badge>
                )}
            </div>

            {/* Allergies - Critical Safety Information */}
            {hasAllergies ? (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-900 dark:text-red-100">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <p className="font-semibold text-xs uppercase tracking-wider mb-1">
                                    Known Allergies
                                </p>
                                <p className="text-sm leading-relaxed">{allergies}</p>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-900/20 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info size={14} />
                        <span>No known allergies documented</span>
                    </div>
                </div>
            )}

            {/* Medical Conditions */}
            {hasConditions ? (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Heart size={14} className="text-amber-600" />
                            Current Medical Conditions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {medicalConditions}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-200 bg-slate-50/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info size={14} />
                            <span>No current medical conditions documented</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Medical History */}
            {hasHistory ? (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText size={14} className="text-blue-600" />
                            Medical History
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Previous surgeries, procedures, and relevant medical history
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {medicalHistory}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-200 bg-slate-50/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info size={14} />
                            <span>No medical history documented</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!hasAnyMedicalInfo && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 dark:bg-slate-900/20 p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                No Medical Information Available
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Medical information will appear here once documented
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
