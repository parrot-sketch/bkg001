'use client';

import { Badge } from '@/components/ui/badge';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { getIntraOpSectionCompletion } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { cn } from '@/lib/utils';

function Item(props: { ok: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="text-sm text-slate-700">{props.label}</div>
      <div className="text-right">
        <Badge
          className={cn(
            'border',
            props.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
          )}
        >
          {props.ok ? 'OK' : 'Needs attention'}
        </Badge>
        {props.hint ? <div className="mt-0.5 text-xs text-slate-500">{props.hint}</div> : null}
      </div>
    </div>
  );
}

export function IntraOpReviewPanel(props: {
  data: NurseIntraOpRecordDraft;
  missingItems: string[];
  isFinal: boolean;
}) {
  const { data, missingItems, isFinal } = props;
  const completion = getIntraOpSectionCompletion(data);

  const whoOk = data.whoChecklistCompleted === 'Y';
  const countOk = data.countCorrect === 'Y';
  const countActionOk = data.countCorrect !== 'N' || !!data.countActionTaken?.trim();
  const scrubNameOk = !!data.scrubNurse?.trim();
  const circulatingNameOk = !!data.circulatingNurse?.trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Review &amp; Finalize</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Quick readiness checks before finalizing the record.
          </div>
        </div>
        <Badge className={cn('border', isFinal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200')}>
          {isFinal ? 'FINAL' : 'DRAFT'}
        </Badge>
      </div>

      <div className="p-4 space-y-2">
        <Item ok={completion.page1.complete} label="Page 1 complete" hint="Patient/file/date/doctor must be filled." />
        <Item ok={completion.page2.complete} label="Page 2 critical items complete" hint="Count correct + signatures captured on finalize." />
        <Item ok={whoOk} label="WHO checklist completed" hint="Must be Yes for recovery gate." />
        <Item ok={countOk} label="Count correct" hint="Must be Yes for recovery gate." />
        <Item ok={countActionOk} label="Action taken (if count incorrect)" />
        <Item ok={scrubNameOk} label="Scrub nurse name present" hint="Used to generate the signature on finalize." />
        <Item ok={circulatingNameOk} label="Circulating nurse name present" hint="Used to generate the signature on finalize." />

        {missingItems.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-900">Missing required items</div>
            <div className="text-xs text-amber-800 mt-1">
              {missingItems.slice(0, 6).join(' • ')}
              {missingItems.length > 6 ? ` • +${missingItems.length - 6} more` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

