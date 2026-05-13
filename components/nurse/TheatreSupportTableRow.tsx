'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import {
    Clock,
    Stethoscope,
    MapPin,
    ClipboardList,
    FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IntraOpSurgicalCase } from '@/lib/api/nurse';

interface TheatreSupportTableRowProps {
    surgicalCase: IntraOpSurgicalCase;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: 'Scheduled', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    IN_PREP: { label: 'Awaiting Theater Entry', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    IN_THEATER: { label: 'In Theater', color: 'bg-red-50 text-red-700 border-red-200 font-semibold' },
};

export function TheatreSupportTableRow({ surgicalCase }: TheatreSupportTableRowProps) {
    const router = useRouter();

    const status = STATUS_CONFIG[surgicalCase.status] ?? STATUS_CONFIG.SCHEDULED;
    const canOpenIntraOpRecord = true;

    return (
        <TableRow className="hover:bg-stone-50/50 cursor-pointer group transition-colors">
            <TableCell className="font-medium" onClick={() => canOpenIntraOpRecord && router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-900">{surgicalCase.patient?.fullName || 'Unknown'}</span>
                        {surgicalCase.patient?.fileNumber && (
                            <span className="text-[10px] text-stone-400">#{surgicalCase.patient.fileNumber}</span>
                        )}
                    </div>
                    <span className="text-[11px] text-stone-500 line-clamp-1">{surgicalCase.procedureName || 'Unspecified Procedure'}</span>
                </div>
            </TableCell>

            <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${status.color}`}>
                        {status.label}
                    </Badge>
            </TableCell>

            <TableCell onClick={() => canOpenIntraOpRecord && router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-stone-400" />
                        {surgicalCase.theaterName || 'Theater TBD'}
                    </div>
                    {surgicalCase.startTime && (
                        <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(surgicalCase.startTime), { addSuffix: true })}
                        </div>
                    )}
                </div>
            </TableCell>

            <TableCell onClick={() => canOpenIntraOpRecord && router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}>
                <div className="flex items-center gap-2 text-xs text-stone-600">
                    <Stethoscope className="h-3.5 w-3.5 text-stone-400" />
                    {surgicalCase.primarySurgeon?.name || 'Unassigned'}
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/nurse/ward-prep/${surgicalCase.id}/checklist?returnTo=${encodeURIComponent('/nurse/theatre-support')}`)}
                        className="h-8 text-xs"
                    >
                        <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                        Ward Checklist
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}
                        className="h-8 text-xs bg-stone-900 hover:bg-black"
                    >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Intra-Op Record
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
