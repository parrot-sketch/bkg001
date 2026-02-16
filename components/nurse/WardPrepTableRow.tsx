'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    MoreHorizontal,
    Stethoscope,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useMarkCaseReady, useInventoryStatus } from '@/hooks/nurse/usePreOpCases';
import type { PreOpSurgicalCase } from '@/lib/api/nurse';
import { InventoryReadinessIndicator } from './InventoryReadinessIndicator';

interface WardPrepTableRowProps {
    surgicalCase: PreOpSurgicalCase;
}

export function WardPrepTableRow({ surgicalCase }: WardPrepTableRowProps) {
    const router = useRouter();
    const markReady = useMarkCaseReady();
    const readiness = surgicalCase.readiness;

    // Fetch inventory status
    const { data: inventoryStatus, isLoading: isLoadingInventory } = useInventoryStatus(surgicalCase.id, true);

    const handleMarkReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!readiness.isReady) {
            toast.error('Cannot mark as ready - missing required items');
            return;
        }
        markReady.mutate(surgicalCase.id, {
            onSuccess: () => toast.success('Case marked as ready for scheduling'),
            onError: (error) => toast.error(error.message),
        });
    };

    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
        DRAFT: { label: 'Draft', variant: 'secondary' },
        PLANNING: { label: 'Planning', variant: 'default' },
        READY_FOR_SCHEDULING: { label: 'Ready', variant: 'default' },
        SCHEDULED: { label: 'Scheduled', variant: 'outline' },
    };

    const urgencyConfig: Record<string, { label: string; className: string }> = {
        ELECTIVE: { label: 'Elective', className: 'bg-slate-100 text-slate-700' },
        URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
        EMERGENCY: { label: 'Emergency', className: 'bg-rose-100 text-rose-700' },
    };

    const status = statusConfig[surgicalCase.status] || { label: surgicalCase.status, variant: 'secondary' };
    const urgency = urgencyConfig[surgicalCase.urgency] || { label: surgicalCase.urgency, className: 'bg-slate-100' };

    return (
        <TableRow
            className="hover:bg-slate-50/50 cursor-pointer group"
            onClick={() => router.push(`/nurse/ward-prep/${surgicalCase.id}`)}
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
                        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0 h-5 font-medium border-slate-200">
                            {status.label}
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
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <Clock className="h-3 w-3" />
                    Created {formatDistanceToNow(new Date(surgicalCase.createdAt), { addSuffix: true })}
                </div>
            </TableCell>

            <TableCell className="w-[220px]">
                <div className="space-y-2">
                    {/* Readiness Bar */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Readiness</span>
                            <span className={`font-medium ${readiness.percentage === 100 ? 'text-emerald-600' :
                                readiness.percentage >= 50 ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                {readiness.percentage}%
                            </span>
                        </div>
                        <Progress
                            value={readiness.percentage}
                            className={`h-1.5 ${readiness.percentage === 100 ? '[&>div]:bg-emerald-500' : ''}`}
                        />
                    </div>

                    {/* Status Indicators Row */}
                    <div className="flex items-center gap-2">
                        {/* Checklist Status */}
                        {readiness.missingItems.length > 0 ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium cursor-help">
                                            <AlertCircle className="h-3 w-3" />
                                            {readiness.missingItems.length} missing
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-semibold mb-1">Missing Items:</p>
                                        <ul className="list-disc pl-4 text-xs">
                                            {readiness.missingItems.map(item => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Complete
                            </div>
                        )}

                        {/* Inventory Status */}
                        <div onClick={(e) => e.stopPropagation()}>
                            <InventoryReadinessIndicator
                                status={inventoryStatus}
                                isLoading={isLoadingInventory}
                            />
                        </div>
                    </div>
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
                            <DropdownMenuItem onClick={() => router.push(`/nurse/ward-prep/${surgicalCase.id}`)}>
                                <ClipboardList className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {readiness.isReady && surgicalCase.status !== 'READY_FOR_SCHEDULING' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleMarkReady} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Ready
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
