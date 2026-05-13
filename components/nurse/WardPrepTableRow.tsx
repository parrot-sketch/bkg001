'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import {
    ClipboardList,
    Clock,
    MoreHorizontal,
    Stethoscope,
    FileText,
    CheckSquare,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useInventoryStatus } from '@/hooks/nurse/usePreOpCases';
import { useMarkInTheater } from '@/hooks/nurse/useMarkInTheater';
import type { PreOpSurgicalCase } from '@/lib/api/nurse';
import { InventoryReadinessIndicator } from './InventoryReadinessIndicator';
import { DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WardPrepTableRowProps {
    surgicalCase: PreOpSurgicalCase;
}

export function WardPrepTableRow({ surgicalCase }: WardPrepTableRowProps) {
    const router = useRouter();
    const markInTheater = useMarkInTheater();

    const { data: inventoryStatus, isLoading: isLoadingInventory } = useInventoryStatus(surgicalCase.id, true);

    const handleMarkInTheater = (e: React.MouseEvent) => {
        e.stopPropagation();
        markInTheater.mutate(surgicalCase.id);
    };

    const handleGoToChecklist = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/nurse/ward-prep/${surgicalCase.id}/checklist`);
    };

    const handleViewDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/nurse/ward-prep/${surgicalCase.id}`);
    };

    const wardChecklistDone = surgicalCase.wardChecklist?.isComplete;
    const wardChecklistStarted = surgicalCase.wardChecklist?.isStarted;
    const showCompleteChecklist = !wardChecklistDone && ['IN_PREP', 'SCHEDULED', 'READY_FOR_WARD_PREP', 'IN_WARD_PREP', 'READY_FOR_THEATER_BOOKING'].includes(surgicalCase.status);
    const canEnterTheater = surgicalCase.status === 'IN_PREP';

    return (
        <TableRow
            className="hover:bg-slate-50/50 cursor-pointer group transition-colors"
            onClick={handleViewDetails}
        >
            <TableCell className="py-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {surgicalCase.patient?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{surgicalCase.patient?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-400">#{surgicalCase.patient?.fileNumber || '—'}</p>
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-slate-700 line-clamp-1">{surgicalCase.procedureName || '—'}</span>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                            {surgicalCase.status.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-[13px] text-slate-500">
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                    {surgicalCase.primarySurgeon?.name || '—'}
                </div>
            </TableCell>

            <TableCell className="text-[12px] text-slate-500">
                {formatDistanceToNow(new Date(surgicalCase.createdAt), { addSuffix: true })}
            </TableCell>

            <TableCell>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Checklist</span>
                        <span className={cn('font-semibold', wardChecklistDone ? 'text-slate-700' : 'text-slate-600')}>
                          {wardChecklistDone ? 'Complete' : wardChecklistStarted ? 'In Progress' : 'Not Started'}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-600 transition-all" style={{ width: wardChecklistDone ? '100%' : '30%' }} />
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    {showCompleteChecklist && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            onClick={handleGoToChecklist}
                            title="Checklist"
                        >
                            <ClipboardList className="h-4 w-4" />
                        </Button>
                    )}
                    {canEnterTheater && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            onClick={handleMarkInTheater}
                            disabled={markInTheater.isPending}
                            title="Mark In Theater"
                        >
                            <DoorOpen className="h-4 w-4" />
                        </Button>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                        <InventoryReadinessIndicator
                            status={inventoryStatus}
                            isLoading={isLoadingInventory}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleViewDetails}>
                                <FileText className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleGoToChecklist}>
                                <ClipboardList className="mr-2 h-4 w-4" />
                                {wardChecklistDone ? 'View Checklist' : wardChecklistStarted ? 'Continue Checklist' : 'Complete Checklist'}
                            </DropdownMenuItem>
                            {canEnterTheater && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleMarkInTheater}>
                                        <DoorOpen className="mr-2 h-4 w-4" /> Mark in Theater
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
