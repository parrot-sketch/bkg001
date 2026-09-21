'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { ChoicePill, TextInput, TypeField, YesNoToggle, stripToPlain } from '../ui';

interface Props {
  value: SurgeonOperativeNoteDraft['operativeRecord'];
  metrics: SurgeonOperativeNoteDraft['intraOpMetrics'];
  complications: SurgeonOperativeNoteDraft['complications'];
  postOpPlan: SurgeonOperativeNoteDraft['postOpPlan'];
  disabled: boolean;
  onChangeRecord: (next: NonNullable<SurgeonOperativeNoteDraft['operativeRecord']>) => void;
  onChangeMetrics: (next: NonNullable<SurgeonOperativeNoteDraft['intraOpMetrics']>) => void;
  onChangeComplications: (
    next: NonNullable<SurgeonOperativeNoteDraft['complications']>,
  ) => void;
  onChangePostOpPlan: (next: NonNullable<SurgeonOperativeNoteDraft['postOpPlan']>) => void;
}

const DISCHARGE = [
  { value: 'WARD', label: 'Ward' },
  { value: 'HOME', label: 'Home' },
  { value: 'ICU', label: 'ICU' },
  { value: 'HDU', label: 'HDU' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function Page2Section({
  value,
  metrics,
  complications,
  postOpPlan,
  disabled,
  onChangeRecord,
  onChangeMetrics,
  onChangeComplications,
  onChangePostOpPlan,
}: Props) {
  const record = value ?? ({} as NonNullable<SurgeonOperativeNoteDraft['operativeRecord']>);
  const m = metrics ?? ({} as NonNullable<SurgeonOperativeNoteDraft['intraOpMetrics']>);
  const c = complications ?? ({} as NonNullable<SurgeonOperativeNoteDraft['complications']>);
  const plan = postOpPlan ?? ({} as NonNullable<SurgeonOperativeNoteDraft['postOpPlan']>);

  const complicationsToggle: 'Y' | 'N' | null =
    c.complicationsOccurred === true ? 'Y' : c.complicationsOccurred === false ? 'N' : null;

  const ebl =
    typeof m.estimatedBloodLossMl === 'number' && !Number.isNaN(m.estimatedBloodLossMl)
      ? String(m.estimatedBloodLossMl)
      : '';

  return (
    <div className="space-y-7">
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Record
        </legend>
        <TypeField
          label="Operation record"
          value={stripToPlain(record.operationRecord)}
          onChange={(operationRecord) => onChangeRecord({ ...record, operationRecord })}
          placeholder="Operation record…"
          disabled={disabled}
          rows={7}
        />
        <TypeField
          label="Post-operative instructions"
          value={stripToPlain(record.postOperativeInstructions)}
          onChange={(postOperativeInstructions) =>
            onChangeRecord({ ...record, postOperativeInstructions })
          }
          placeholder="Post-op instructions…"
          disabled={disabled}
          rows={5}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Clinical extras
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs font-medium text-slate-600">Complications</p>
            <YesNoToggle
              value={complicationsToggle}
              disabled={disabled}
              onChange={(next) =>
                onChangeComplications({
                  ...c,
                  complicationsOccurred: next === 'Y',
                  complicationsDetails: next === 'N' ? '' : c.complicationsDetails,
                })
              }
            />
            {complicationsToggle === 'Y' ? (
              <TypeField
                label="Details"
                value={stripToPlain(c.complicationsDetails)}
                onChange={(complicationsDetails) =>
                  onChangeComplications({ ...c, complicationsDetails })
                }
                placeholder="Complication details…"
                disabled={disabled}
                rows={3}
              />
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <TextInput
              label="Estimated blood loss (ml)"
              value={ebl}
              onChange={(raw) => {
                const trimmed = raw.trim();
                if (!trimmed) {
                  const { estimatedBloodLossMl: _drop, ...rest } = m as Record<string, unknown>;
                  onChangeMetrics(rest as NonNullable<SurgeonOperativeNoteDraft['intraOpMetrics']>);
                  return;
                }
                const n = Number(trimmed.replace(/[^\d]/g, ''));
                if (Number.isFinite(n)) {
                  onChangeMetrics({ ...m, estimatedBloodLossMl: n });
                }
              }}
              placeholder="e.g. 50"
              disabled={disabled}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Discharge to</p>
              <div className="flex flex-wrap gap-2">
                {DISCHARGE.map((opt) => (
                  <ChoicePill
                    key={opt.value}
                    selected={plan.dischargeDestination === opt.value}
                    disabled={disabled}
                    onClick={() =>
                      onChangePostOpPlan({
                        ...plan,
                        dischargeDestination:
                          plan.dischargeDestination === opt.value ? undefined : opt.value,
                      })
                    }
                  >
                    {opt.label}
                  </ChoicePill>
                ))}
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Surgeon / anaesthesiologist signature
        </p>
        {record.surgeonOrAnesthesiologistSignaturePng ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Signature"
            src={record.surgeonOrAnesthesiologistSignaturePng}
            className="mt-2 h-16 max-w-full object-contain"
          />
        ) : (
          <p className="mt-2 text-xs text-slate-400">Applied automatically when you finalize</p>
        )}
      </div>
    </div>
  );
}
