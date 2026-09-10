'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { ClipboardList, MoreHorizontal, FileText, DoorOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkInTheater } from '@/hooks/nurse/useMarkInTheater';
import type { PreOpSurgicalCase } from '@/lib/api/nurse';
import { cn } from '@/lib/utils';
import { getSurgicalCaseStatusDisplay } from '@/lib/surgical-case-status-display';

interface WardPrepTableRowProps {
  surgicalCase: PreOpSurgicalCase;
}

export function WardPrepTableRow({ surgicalCase }: WardPrepTableRowProps) {
  const router = useRouter();
  const markInTheater = useMarkInTheater();

  const wardChecklistDone = surgicalCase.wardChecklist?.isComplete;
  const wardChecklistStarted = surgicalCase.wardChecklist?.isStarted;
  const canEnterTheater = surgicalCase.status === 'IN_PREP';
  const checklistLabel = wardChecklistDone
    ? 'View checklist'
    : wardChecklistStarted
      ? 'Continue checklist'
      : 'Open checklist';

  const openChecklist = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/nurse/ward-prep/${surgicalCase.id}/checklist`);
  };

  const openDetails = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/nurse/ward-prep/${surgicalCase.id}`);
  };

  const handleMarkInTheater = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    markInTheater.mutate(surgicalCase.id);
  };

  return (
    <TableRow className="hover:bg-slate-50/50 group transition-colors">
      <TableCell className="py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {surgicalCase.patient?.fullName || 'Unknown'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            #{surgicalCase.patient?.fileNumber || '—'}
          </p>
        </div>
      </TableCell>

      <TableCell>
        <span className="text-sm text-slate-700 line-clamp-1">
          {surgicalCase.procedureName || '—'}
        </span>
      </TableCell>

      <TableCell>
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 py-0 h-5 font-normal',
            getSurgicalCaseStatusDisplay(surgicalCase.status).className,
          )}
        >
          {getSurgicalCaseStatusDisplay(surgicalCase.status).label}
        </Badge>
      </TableCell>

      <TableCell className="text-sm text-slate-600">
        {surgicalCase.primarySurgeon?.name || '—'}
      </TableCell>

      <TableCell>
        <span
          className={cn(
            'text-xs font-medium',
            wardChecklistDone
              ? 'text-emerald-700'
              : wardChecklistStarted
                ? 'text-amber-700'
                : 'text-slate-500',
          )}
        >
          {wardChecklistDone ? 'Complete' : wardChecklistStarted ? 'In progress' : 'Not started'}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" className="h-8 text-xs" onClick={() => openChecklist()}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            {checklistLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openDetails()}>
                <FileText className="mr-2 h-4 w-4" /> Case details
              </DropdownMenuItem>
              {canEnterTheater && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleMarkInTheater()}>
                    <DoorOpen className="mr-2 h-4 w-4" /> Mark in theater
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
