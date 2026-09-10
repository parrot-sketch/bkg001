'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { HeartPulse, MoreHorizontal, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RecoverySurgicalCase } from '@/lib/api/nurse';
import { getSurgicalCaseStatusDisplay } from '@/lib/surgical-case-status-display';
import { cn } from '@/lib/utils';

interface RecoveryCaseTableRowProps {
  surgicalCase: RecoverySurgicalCase;
}

export function RecoveryCaseTableRow({ surgicalCase }: RecoveryCaseTableRowProps) {
  const router = useRouter();
  const hasIntraOpRecord = Boolean(surgicalCase.hasIntraOpRecord);
  const statusCfg = getSurgicalCaseStatusDisplay(surgicalCase.status);

  const openPostOp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/nurse/recovery-cases/${surgicalCase.id}/record`);
  };

  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
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

      <TableCell className="text-sm text-slate-600">
        {surgicalCase.primarySurgeon?.name || '—'}
      </TableCell>

      <TableCell>
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0 h-5 font-normal', statusCfg.className)}
        >
          {statusCfg.label}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" className="h-8 text-xs" onClick={() => openPostOp()}>
            <HeartPulse className="h-3.5 w-3.5 mr-1.5" />
            Open record
          </Button>
          {hasIntraOpRecord && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/nurse/intra-op-cases/${surgicalCase.id}/record`)
                  }
                >
                  <Activity className="mr-2 h-4 w-4" /> View Intra-Op record
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
