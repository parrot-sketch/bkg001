'use client';

import { Shield, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReadinessChecklistProps {
    patient: any;
    isCompleted: boolean;
}

export function ReadinessChecklist({ patient, isCompleted }: ReadinessChecklistProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Surgical Readiness
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <CheckItem label="Patient Demographics" checked={!!patient} />
                <CheckItem label="Consultation Completed" checked={isCompleted} />
                <CheckItem label="Operative Plan" checked={false} />
                <CheckItem label="Consents Signed" checked={false} />
            </CardContent>
        </Card>
    );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <span className={cn("text-sm font-medium", checked ? "text-slate-700" : "text-slate-400")}>{label}</span>
            {checked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
                <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
            )}
        </div>
    );
}
