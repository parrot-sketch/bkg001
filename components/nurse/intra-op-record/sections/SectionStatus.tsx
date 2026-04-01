'use client';

import { Badge } from '@/components/ui/badge';

interface SectionStatusProps {
    complete: boolean;
    label: string;
    isCritical?: boolean;
}

export function SectionStatus({ complete, label, isCritical }: SectionStatusProps) {
    return (
        <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-sm">{label}</span>
            {isCritical && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                    Safety Critical
                </Badge>
            )}
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
    );
}
