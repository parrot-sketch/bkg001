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
    LogOut
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RecoverySurgicalCase } from '@/lib/api/nurse';

interface RecoveryCaseTableRowProps {
    surgicalCase: RecoverySurgicalCase;
}

export function RecoveryCaseTableRow({ surgicalCase }: RecoveryCaseTableRowProps) {
    const router = useRouter();

    const urgencyConfig: Record<string, { label: string; className: string }> = {
        ELECTIVE: { label: 'Elective', className: 'bg-slate-100 text-slate-700' },
        URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
        EMERGENCY: { label: 'Emergency', className: 'bg-rose-100 text-rose-700' },
    };

    const urgency = urgencyConfig[surgicalCase.urgency] || { label: surgicalCase.urgency, className: 'bg-slate-100' };

    return (
        <TableRow
            className="hover:bg-emerald-50/30 cursor-pointer group transition-colors"
            onClick={() => router.push(`/nurse/recovery-cases/${surgicalCase.id}/record`)}
        >
            <TableCell className="font-medium">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{surgicalCase.patient?.fullName || 'Unknown'}</span>
                        {surgicalCase.patient?.fileNumber && (
                            <span className="text-[10px] text-slate-400">#{surgicalCase.patient.fileNumber}</span>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{surgicalCase.procedureName || 'Unspecified Procedure'}</span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 font-medium bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                            In Recovery
                        </Badge>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.className}`}>
                            {urgency.label}
                        </span>
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                    {surgicalCase.primarySurgeon?.name || 'Unassigned'}
                </div>
            </TableCell>

            <TableCell>
                {/* Placeholder for recovery duration or vitals summary if available later */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>Monitoring active</span>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                    >
                        <div className="cursor-pointer">
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        </div>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/nurse/recovery-cases/${surgicalCase.id}/record`)}>
                                <HeartPulse className="mr-2 h-4 w-4" /> Recovery Record
                            </DropdownMenuItem>
                            {/* Add Discharge action later when implemented */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
}
