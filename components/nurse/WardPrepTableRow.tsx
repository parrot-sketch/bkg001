'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    MoreHorizontal,
    Stethoscope,
    FileText,
    AlertCircle,
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useMarkCaseReady, useInventoryStatus } from '@/hooks/nurse/usePreOpCases';
import { useMarkInTheater } from '@/hooks/nurse/useMarkInTheater';
import type { PreOpSurgicalCase } from '@/lib/api/nurse';
import { InventoryReadinessIndicator } from './InventoryReadinessIndicator';
import { DoorOpen } from 'lucide-react';

interface WardPrepTableRowProps {
    surgicalCase: PreOpSurgicalCase;
}

export function WardPrepTableRow({ surgicalCase }: WardPrepTableRowProps) {
    const router = useRouter();
    const markReady = useMarkCaseReady();
    const markInTheater = useMarkInTheater();
    const readiness = surgicalCase.readiness;

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

    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
        DRAFT: { label: 'Draft', variant: 'secondary' },
        PLANNING: { label: 'Planning', variant: 'default' },
        READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        SCHEDULED: { label: 'Scheduled', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        IN_PREP: { label: 'In Pre-Op', variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        IN_THEATER: { label: 'In Theater', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        RECOVERY: { label: 'Recovery', variant: 'outline', className: 'bg-purple-50 text-purple-700 border-purple-200' },
        COMPLETED: { label: 'Completed', variant: 'outline', className: 'bg-slate-50 text-slate-700 border-slate-200' },
    };

    const urgencyConfig: Record<string, { label: string; className: string }> = {
        ELECTIVE: { label: 'Elective', className: 'bg-slate-100 text-slate-700' },
        URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
        EMERGENCY: { label: 'Emergency', className: 'bg-rose-100 text-rose-700' },
    };

    const status = statusConfig[surgicalCase.status] || { label: surgicalCase.status, variant: 'secondary' };
    const urgency = urgencyConfig[surgicalCase.urgency] || { label: surgicalCase.urgency, className: 'bg-slate-100' };

    const wardChecklistDone = surgicalCase.wardChecklist?.isComplete;
    const wardChecklistStarted = surgicalCase.wardChecklist?.isStarted;
    
    const showCompleteChecklist = !wardChecklistDone && (surgicalCase.status === 'IN_PREP' || surgicalCase.status === 'SCHEDULED' || surgicalCase.status === 'READY_FOR_SCHEDULING');

    return (
        <TableRow
            className="hover:bg-slate-50/50 cursor-pointer group"
            onClick={handleViewDetails}
        >
            <TableCell className="font-medium py-4">
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
                        <Badge 
                            variant={status.variant} 
                            className={`text-[10px] px-1.5 py-0 h-5 font-medium ${status.className || 'border-slate-200'}`}
                        >
                            {status.label}
                        </Badge>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.className}`}>
                            {urgency.label}
                        </span>
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                        {surgicalCase.primarySurgeon?.name || 'Unassigned'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(surgicalCase.createdAt), { addSuffix: true })}
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Ward Checklist</span>
                        <span className={`text-xs font-bold ${wardChecklistDone ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {wardChecklistDone ? '100%' : wardChecklistStarted ? 'In Progress' : '0%'}
                        </span>
                    </div>
                    <Progress 
                        value={wardChecklistDone ? 100 : 0} 
                        className={`h-2 ${wardChecklistDone ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-400'}`}
                    />
                    {readiness.missingItems.length > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-[10px] text-amber-600 cursor-help">
                                        <AlertCircle className="h-3 w-3" />
                                        {readiness.missingItems.length} other items pending
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
                    )}
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    {showCompleteChecklist && (
                        <Button
                            size="sm"
                            variant={wardChecklistStarted ? "outline" : "default"}
                            className={`h-8 text-xs ${wardChecklistStarted ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            onClick={handleGoToChecklist}
                        >
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {wardChecklistStarted ? 'Continue' : 'Complete'} Checklist
                        </Button>
                    )}
                    {wardChecklistDone && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                                        onClick={handleGoToChecklist}
                                    >
                                        <FileText className="h-3 w-3 mr-1" />
                                        View
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Ward checklist completed</p>
                                    {surgicalCase.wardChecklist?.signedBy && (
                                        <p className="text-xs text-slate-500 mt-1">Signed by: {surgicalCase.wardChecklist.signedBy}</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                        <InventoryReadinessIndicator
                            status={inventoryStatus}
                            isLoading={isLoadingInventory}
                        />
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {readiness.isReady && surgicalCase.status !== 'READY_FOR_SCHEDULING' && surgicalCase.status !== 'SCHEDULED' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={handleMarkReady}
                        >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Ready
                        </Button>
                    )}
                    {surgicalCase.status === 'IN_PREP' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={handleMarkInTheater}
                            disabled={markInTheater.isPending}
                        >
                            <DoorOpen className="h-3 w-3 mr-1" />
                            {markInTheater.isPending ? '...' : 'To Theater'}
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleViewDetails}>
                                <ClipboardList className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleGoToChecklist}>
                                <CheckSquare className="mr-2 h-4 w-4" /> 
                                {wardChecklistDone ? 'View Checklist' : wardChecklistStarted ? 'Continue Checklist' : 'Complete Checklist'}
                            </DropdownMenuItem>
                            {readiness.isReady && surgicalCase.status !== 'READY_FOR_SCHEDULING' && surgicalCase.status !== 'SCHEDULED' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleMarkReady} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Ready for Scheduling
                                    </DropdownMenuItem>
                                </>
                            )}
                            {surgicalCase.status === 'IN_PREP' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleMarkInTheater} className="text-amber-600 focus:text-amber-700 focus:bg-amber-50">
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
