'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { cn } from '@/lib/utils';

interface ConsentsTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function ConsentsTab({ casePlan }: ConsentsTabProps) {
    const consents = casePlan?.consents || [];

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Surgical Consents</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and track patient consent forms</p>
                </div>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Consent
                </Button>
            </div>

            {/* Consent List */}
            {consents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <div className="bg-muted p-3 rounded-full mb-4">
                        <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold text-foreground">No consents generated</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Generate the standard consent bundle or create a custom consent form to get started.
                    </p>
                    <Button variant="outline" className="mt-5">
                        Generate Standard Bundle
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {consents.map((consent) => (
                        <div
                            key={consent.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                    "p-2 rounded-lg shrink-0",
                                    consent.status === 'SIGNED'
                                        ? "bg-emerald-100 text-emerald-600"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {consent.status === 'SIGNED' ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Clock className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-medium text-sm truncate">{consent.title}</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Created {new Date(consent.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Badge variant={consent.status === 'SIGNED' ? 'default' : 'secondary'}>
                                    {consent.status}
                                </Badge>
                                <Button variant="ghost" size="sm" className="text-xs">
                                    View
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Legal Reminder */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <div className="text-sm">
                    <p className="font-medium">Legal Requirement</p>
                    <p className="mt-0.5 text-amber-800">
                        All consent forms must be signed by the patient and witnessed before theater admission.
                        Digital signatures are legally binding.
                    </p>
                </div>
            </div>
        </div>
    );
}
