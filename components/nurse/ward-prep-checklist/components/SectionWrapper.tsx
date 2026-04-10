'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileCheck, TestTube2, Pill, AlertTriangle, Scissors, Eye, Activity, ArrowRightLeft, User2 } from 'lucide-react';

const SECTION_ICONS: Record<string, React.ElementType> = {
    documentation: FileCheck,
    bloodResults: TestTube2,
    medications: Pill,
    allergiesNpo: AlertTriangle,
    preparation: Scissors,
    prosthetics: Eye,
    vitals: Activity,
    handover: ArrowRightLeft,
};

interface SectionWrapperProps {
    sectionKey: string;
    label: string;
    complete: boolean;
    children: ReactNode;
}

export function SectionWrapper({ sectionKey, label, complete, children }: SectionWrapperProps) {
    const Icon = SECTION_ICONS[sectionKey] || FileCheck;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 flex-1">
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-sm">{label}</span>
                {complete ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                        Complete
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Pending
                    </Badge>
                )}
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                {children}
            </div>
        </div>
    );
}