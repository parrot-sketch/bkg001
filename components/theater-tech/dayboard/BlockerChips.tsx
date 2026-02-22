/**
 * Component: BlockerChips
 *
 * Displays readiness status chips for a surgical case.
 * Pure presentation component - no business logic.
 */

import { cn } from '@/lib/utils';
import type { DayboardBlockersDto, DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';

interface BlockerChipsProps {
  blockers: DayboardBlockersDto;
  status: string;
  timeline: DayboardCaseDto['timeline'];
}

export function BlockerChips({ blockers, status, timeline }: BlockerChipsProps) {
  const chips: { label: string; color: string }[] = [];

  if (status === 'IN_THEATER' || status === 'IN_PREP') {
    // Show intra-op status for in-theater cases
    if (blockers.nurseIntraOpStatus === 'FINAL') {
      chips.push({ label: 'Intra-Op ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.nurseIntraOpStatus === 'DRAFT') {
      chips.push({ label: 'Intra-Op Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    }
    if (blockers.intraOpDiscrepancy) {
      chips.push({ label: 'Count Discrepancy', color: 'bg-red-50 text-red-700 border-red-200' });
    }
  }

  // Nurse pre-op
  if (blockers.nursePreopStatus === 'FINAL') {
    chips.push({ label: 'Pre-Op ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  } else if (blockers.nursePreopStatus === 'DRAFT') {
    chips.push({ label: 'Pre-Op Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  } else {
    chips.push({ label: 'No Pre-Op', color: 'bg-slate-50 text-slate-500 border-slate-200' });
  }

  // Recovery
  if (status === 'RECOVERY' || status === 'COMPLETED') {
    if (blockers.nurseRecoveryStatus === 'FINAL' && blockers.dischargeReady) {
      chips.push({ label: 'Recovery ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.nurseRecoveryStatus === 'DRAFT') {
      chips.push({ label: 'Recovery Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    } else if (blockers.nurseRecoveryStatus === 'FINAL' && !blockers.dischargeReady) {
      chips.push({ label: 'Recovery Hold', color: 'bg-red-50 text-red-700 border-red-200' });
    } else if (!blockers.nurseRecoveryStatus) {
      chips.push({ label: 'No Recovery', color: 'bg-slate-50 text-slate-500 border-slate-200' });
    }
  }

  // Consents
  if (blockers.consentsTotalCount > 0) {
    const allSigned = blockers.consentsSignedCount === blockers.consentsTotalCount;
    chips.push({
      label: `Consents ${blockers.consentsSignedCount}/${blockers.consentsTotalCount}`,
      color: allSigned
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
    });
  }

  // Timeline soft warnings
  if (status === 'IN_THEATER' && (!timeline?.incisionTime)) {
    chips.push({ label: 'No Incision Time', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  }
  if (status === 'RECOVERY' && (!timeline?.wheelsOut)) {
    chips.push({ label: 'No Wheels Out', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  }

  // Doctor plan
  if (blockers.doctorPlanReady) {
    chips.push({ label: 'Plan ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  } else if (blockers.doctorPlanningMissingCount > 0) {
    chips.push({
      label: `Plan: ${blockers.doctorPlanningMissingCount} missing`,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    });
  }

  // Operative note (show for IN_THEATER, RECOVERY, COMPLETED)
  if (status === 'IN_THEATER' || status === 'RECOVERY' || status === 'COMPLETED') {
    if (blockers.operativeNoteStatus === 'FINAL') {
      chips.push({ label: 'Op Note ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.operativeNoteStatus === 'DRAFT') {
      chips.push({ label: 'Op Note Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    } else if (status === 'COMPLETED') {
      chips.push({ label: 'Op Note Missing', color: 'bg-red-50 text-red-700 border-red-200' });
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded border',
            chip.color
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
