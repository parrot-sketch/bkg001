'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import {
    HeartPulse,
    MoreHorizontal,
    Stethoscope,
    ChevronRight,
    Clock,
    LogOut,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { RecoverySurgicalCase } from '@/lib/api/nurse';

interface RecoveryCaseTableRowProps {
    surgicalCase: RecoverySurgicalCase;
}

export function RecoveryCaseTableRow({ surgicalCase }: RecoveryCaseTableRowProps) {
    const router = useRouter();
    const hasIntraOpRecord = Boolean(surgicalCase.hasIntraOpRecord);

    return (
        <TableRow
            className="group hover:bg-slate-50/40 cursor-pointer transition-colors"
            onClick={() => router.push(`/nurse/recovery-cases/${surgicalCase.id}/record`)}
        >
            <TableCell className="py-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {surgicalCase.patient?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{surgicalCase.patient?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500">#{surgicalCase.patient?.fileNumber || '—'}</p>
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-slate-700 line-clamp-1">{surgicalCase.procedureName || '—'}</span>
                </div>
            </TableCell>

            <TableCell className="text-[13px] text-slate-600">
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                    {surgicalCase.primarySurgeon?.name || '—'}
                </div>
            </TableCell>

            <TableCell className="text-[13px] text-slate-500">
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>In recovery</span>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/nurse/recovery-cases/${surgicalCase.id}/record`)}>
                                <HeartPulse className="mr-2 h-4 w-4" /> Recovery Record
                            </DropdownMenuItem>
                            {hasIntraOpRecord && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)}>
                                        <LogOut className="mr-2 h-4 w-4" /> Intra-Op Record
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
}
