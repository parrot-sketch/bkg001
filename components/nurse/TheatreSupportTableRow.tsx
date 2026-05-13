'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import {
    Stethoscope,
    MapPin,
    ChevronRight,
} from 'lucide-react';
import type { IntraOpSurgicalCase } from '@/lib/api/nurse';

const INTRA_OP_STATUS_CONFIG: Record<string, { label: string }> = {
    SCHEDULED: { label: 'Scheduled' },
    IN_PREP: { label: 'In Prep' },
    IN_THEATER: { label: 'In Theater' },
};

interface TheatreSupportTableRowProps {
    surgicalCase: IntraOpSurgicalCase;
}

export function TheatreSupportTableRow({ surgicalCase }: TheatreSupportTableRowProps) {
    const router = useRouter();
    const status = INTRA_OP_STATUS_CONFIG[surgicalCase.status] ?? INTRA_OP_STATUS_CONFIG.SCHEDULED;

    return (
        <TableRow className="group hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}>
            <TableCell className="py-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {surgicalCase.patient?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{surgicalCase.patient?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{surgicalCase.procedureName || '—'}</p>
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-slate-100 text-slate-600 border-slate-200">
                    {status.label}
                </Badge>
            </TableCell>

            <TableCell className="text-[13px] text-slate-600">
                <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {surgicalCase.theaterName || 'TBD'}
                </div>
            </TableCell>

            <TableCell className="text-[13px] text-slate-500">
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                    {surgicalCase.primarySurgeon?.name || '—'}
                </div>
            </TableCell>

            <TableCell className="text-right">
                <Button size="sm" variant="ghost" className="h-8 text-[11px] text-slate-600">
                  Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
            </TableCell>
        </TableRow>
    );
}
