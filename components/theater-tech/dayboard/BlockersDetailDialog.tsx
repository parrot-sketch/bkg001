/**
 * Component: BlockersDetailDialog
 *
 * Dialog showing detailed readiness blockers for a surgical case.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';

interface BlockersDetailDialogProps {
  caseData: DayboardCaseDto;
  onClose: () => void;
}

export function BlockersDetailDialog({ caseData, onClose }: BlockersDetailDialogProps) {
  const b = caseData.blockers;

  const items: { label: string; status: 'ok' | 'warn' | 'error' | 'info' }[] = [
    {
      label: b.doctorPlanReady
        ? 'Doctor planning complete'
        : `Doctor planning: ${b.doctorPlanningMissingCount} item(s) missing`,
      status: b.doctorPlanReady ? 'ok' : b.doctorPlanningMissingCount > 2 ? 'error' : 'warn',
    },
    {
      label:
        b.nursePreopStatus === 'FINAL'
          ? 'Nurse pre-op checklist finalized'
          : b.nursePreopStatus === 'DRAFT'
          ? 'Nurse pre-op checklist in draft'
          : 'Nurse pre-op checklist not started',
      status: b.nursePreopStatus === 'FINAL' ? 'ok' : b.nursePreopStatus === 'DRAFT' ? 'warn' : 'error',
    },
    {
      label:
        b.consentsTotalCount === 0
          ? 'No consents created'
          : `Consents signed: ${b.consentsSignedCount} of ${b.consentsTotalCount}`,
      status:
        b.consentsTotalCount === 0
          ? 'error'
          : b.consentsSignedCount === b.consentsTotalCount
          ? 'ok'
          : 'warn',
    },
    {
      label: `Pre-op photos: ${b.preOpPhotosCount}`,
      status: b.preOpPhotosCount > 0 ? 'ok' : 'warn',
    },
    {
      label:
        b.nurseIntraOpStatus === 'FINAL'
          ? 'Intra-op record finalized'
          : b.nurseIntraOpStatus === 'DRAFT'
          ? 'Intra-op record in draft'
          : 'Intra-op record not started',
      status:
        b.nurseIntraOpStatus === 'FINAL'
          ? 'ok'
          : b.nurseIntraOpStatus === 'DRAFT'
          ? 'info'
          : 'info',
    },
  ];

  if (b.intraOpDiscrepancy) {
    items.push({
      label: 'Count discrepancy flagged in intra-op record',
      status: 'error',
    });
  }

  // Recovery record
  items.push({
    label:
      b.nurseRecoveryStatus === 'FINAL'
        ? 'Recovery record finalized'
        : b.nurseRecoveryStatus === 'DRAFT'
        ? 'Recovery record in draft'
        : 'Recovery record not started',
    status:
      b.nurseRecoveryStatus === 'FINAL'
        ? 'ok'
        : b.nurseRecoveryStatus === 'DRAFT'
        ? 'warn'
        : caseData.status === 'RECOVERY' || caseData.status === 'COMPLETED'
        ? 'error'
        : 'info',
  });

  if (b.nurseRecoveryStatus === 'FINAL' && !b.dischargeReady) {
    items.push({
      label: 'Recovery: Discharge criteria not met or decision is HOLD',
      status: 'error',
    });
  }

  // Checklist
  items.push(
    {
      label: caseData.checklist.signInCompleted ? 'WHO Sign-In complete' : 'WHO Sign-In pending',
      status: caseData.checklist.signInCompleted ? 'ok' : 'info',
    },
    {
      label: caseData.checklist.timeOutCompleted ? 'WHO Time-Out complete' : 'WHO Time-Out pending',
      status: caseData.checklist.timeOutCompleted ? 'ok' : 'info',
    },
    {
      label: caseData.checklist.signOutCompleted ? 'WHO Sign-Out complete' : 'WHO Sign-Out pending',
      status: caseData.checklist.signOutCompleted ? 'ok' : 'info',
    }
  );

  const statusIcon = {
    ok: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    info: <Clock className="h-3.5 w-3.5 text-slate-400" />,
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Case Readiness</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                item.status === 'ok'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : item.status === 'warn'
                  ? 'bg-amber-50/50 border-amber-200'
                  : item.status === 'error'
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-slate-50/50 border-slate-200'
              )}
            >
              {statusIcon[item.status]}
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
