'use client';

import type {
  NurseIntraOpRecordDraft,
  ArrivalMode,
  ASAClass,
  CannulaPosition,
  PatientPosition,
  SkinPrepAgent,
  DrainType,
  WoundIrrigation,
  WoundClass,
  TourniquetSide,
  AnaesthesiaType,
  Sex,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { YnCheckboxPair, TickOption } from './shared';

function setArrayToggle<T extends string>(arr: T[], value: T, checked: boolean): T[] {
  const set = new Set(arr);
  if (checked) set.add(value);
  else set.delete(value);
  return Array.from(set);
}

function singleSelect<T>(current: T | undefined, next: T): T | undefined {
  return current === next ? undefined : next;
}

export function Page1PreOpSection(props: {
  data: NurseIntraOpRecordDraft;
  disabled: boolean;
  onChange: (next: NurseIntraOpRecordDraft) => void;
}) {
  const { data, disabled, onChange } = props;

  const set = <K extends keyof NurseIntraOpRecordDraft>(key: K, value: NurseIntraOpRecordDraft[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-8">
      {/* Patient identification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
            Patient File No.
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={data.patientFileNo ?? ''}
            disabled={disabled}
            onChange={(e) => set('patientFileNo', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
            Name
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={data.patientName ?? ''}
            disabled={disabled}
            onChange={(e) => set('patientName', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
            Age
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            type="number"
            value={data.age ?? ''}
            disabled={disabled}
            onChange={(e) => set('age', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
              Sex
            </label>
            <div className="flex items-center gap-4 h-10">
              {(['Male', 'Female', 'Other'] as Sex[]).map((s) => (
                <TickOption
                  key={s}
                  label={s}
                  checked={data.sex === s}
                  disabled={disabled}
                  onChange={() => set('sex', singleSelect(data.sex, s))}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
              Date
            </label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="date"
              value={data.date ?? ''}
              disabled={disabled}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
            Doctor
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={data.doctor ?? ''}
            disabled={disabled}
            onChange={(e) => set('doctor', e.target.value)}
          />
        </div>
      </div>

      {/* Arrival details */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Arrival Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="date"
              value={data.arrivalDate ?? ''}
              disabled={disabled}
              onChange={(e) => set('arrivalDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time in</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.timeIn ?? ''}
              disabled={disabled}
              onChange={(e) => set('timeIn', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
            <div className="flex items-center gap-4 h-10">
              {(['Stretcher', 'Wheelchair', 'Walking'] as ArrivalMode[]).map((m) => (
                <TickOption
                  key={m}
                  label={m}
                  checked={data.arrivalMode === m}
                  disabled={disabled}
                  onChange={() => set('arrivalMode', singleSelect(data.arrivalMode, m))}
                />
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Allergies</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.allergies ?? ''}
              disabled={disabled}
              onChange={(e) => set('allergies', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ASA Class</label>
            <div className="flex items-center gap-4 h-10">
              {([1, 2, 3, 4] as ASAClass[]).map((c) => (
                <TickOption
                  key={c}
                  label={String(c)}
                  checked={data.asaClass === c}
                  disabled={disabled}
                  onChange={() => set('asaClass', singleSelect(data.asaClass, c))}
                />
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={data.comments ?? ''}
              disabled={disabled}
              onChange={(e) => set('comments', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pre-op checklist */}
      <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Pre-op Checklist (Y/N)
        </div>
        <YnCheckboxPair
          label="Patient ID verified with Reg No."
          value={data.patientIdVerified}
          disabled={disabled}
          onChange={(v) => set('patientIdVerified', v)}
        />
        <YnCheckboxPair
          label="Informed consent signed"
          value={data.informedConsentSigned}
          disabled={disabled}
          onChange={(v) => set('informedConsentSigned', v)}
        />
        <YnCheckboxPair
          label="Pre-op checklist completed"
          value={data.preOpChecklistCompleted}
          disabled={disabled}
          onChange={(v) => set('preOpChecklistCompleted', v)}
        />
        <YnCheckboxPair
          label="WHO checklist completed"
          value={data.whoChecklistCompleted}
          disabled={disabled}
          onChange={(v) => set('whoChecklistCompleted', v)}
        />
        <YnCheckboxPair
          label="Arrived with IV infusing"
          value={data.arrivedWithIVInfusing}
          disabled={disabled}
          onChange={(v) => set('arrivedWithIVInfusing', v)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">IV started by</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.ivStartedBy ?? ''}
              disabled={disabled}
              onChange={(e) => set('ivStartedBy', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.ivStartTime ?? ''}
              disabled={disabled}
              onChange={(e) => set('ivStartTime', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Position
            </label>
            <div className="flex flex-wrap items-center gap-4 min-h-10">
              {(['RA', 'LA', 'RL', 'LL', 'Other'] as CannulaPosition[]).map((pos) => (
                <TickOption
                  key={pos}
                  label={pos}
                  checked={data.cannulaPosition === pos}
                  disabled={disabled}
                  onChange={() => set('cannulaPosition', singleSelect(data.cannulaPosition, pos))}
                />
              ))}
              {data.cannulaPosition === 'Other' && (
                <input
                  className="h-9 px-3 border rounded-md text-sm"
                  value={data.cannulaPositionOther ?? ''}
                  disabled={disabled}
                  placeholder="Other…"
                  onChange={(e) => set('cannulaPositionOther', e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theatre timing & safety */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Theatre Timing &amp; Safety
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-4">
            <YnCheckboxPair
              label="Antibiotic ordered"
              value={data.antibioticOrdered}
              disabled={disabled}
              onChange={(v) => set('antibioticOrdered', v)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.antibioticType ?? ''}
              disabled={disabled}
              onChange={(e) => set('antibioticType', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ordered by</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.antibioticOrderedBy ?? ''}
              disabled={disabled}
              onChange={(e) => set('antibioticOrderedBy', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.antibioticTime ?? ''}
              disabled={disabled}
              onChange={(e) => set('antibioticTime', e.target.value)}
            />
          </div>
          <div />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time in theatre</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.timeInTheatre ?? ''}
              disabled={disabled}
              onChange={(e) => set('timeInTheatre', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time out of theatre</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.timeOutOfTheatre ?? ''}
              disabled={disabled}
              onChange={(e) => set('timeOutOfTheatre', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Operation start</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.operationStart ?? ''}
              disabled={disabled}
              onChange={(e) => set('operationStart', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Finish</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              type="time"
              value={data.operationFinish ?? ''}
              disabled={disabled}
              onChange={(e) => set('operationFinish', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <YnCheckboxPair
              label="Safety belt applied"
              value={data.safetyBeltApplied}
              disabled={disabled}
              onChange={(v) => set('safetyBeltApplied', v)}
            />
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Position</label>
              <input
                className="w-full h-10 px-3 border rounded-md text-sm"
                value={data.safetyBeltPosition ?? ''}
                disabled={disabled}
                onChange={(e) => set('safetyBeltPosition', e.target.value)}
              />
            </div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <YnCheckboxPair
              label="Arms secured"
              value={data.armsSecured}
              disabled={disabled}
              onChange={(v) => set('armsSecured', v)}
            />
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Position</label>
              <input
                className="w-full h-10 px-3 border rounded-md text-sm"
                value={data.armsPosition ?? ''}
                disabled={disabled}
                onChange={(e) => set('armsPosition', e.target.value)}
              />
            </div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <YnCheckboxPair
              label="Patient in proper body alignment"
              value={data.properBodyAlignment}
              disabled={disabled}
              onChange={(v) => set('properBodyAlignment', v)}
            />
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
              Pressure points (describe)
            </label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.pressurePointsDescription ?? ''}
              disabled={disabled}
              onChange={(e) => set('pressurePointsDescription', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Urinary catheter & intra-op imaging */}
      <div className="border border-slate-200 rounded-md p-4 bg-white space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Urinary Catheter &amp; Intra-op Imaging
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YnCheckboxPair
            label="Urinary catheter in-situ"
            value={data.urinaryCatheterInSitu}
            disabled={disabled}
            onChange={(v) => set('urinaryCatheterInSitu', v)}
          />
          <YnCheckboxPair
            label="Urinary catheter inserted in theatre"
            value={data.urinaryCatheterInsertedInTheatre}
            disabled={disabled}
            onChange={(v) => set('urinaryCatheterInsertedInTheatre', v)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.catheterType ?? ''}
              disabled={disabled}
              onChange={(e) => set('catheterType', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.catheterSize ?? ''}
              disabled={disabled}
              onChange={(e) => set('catheterSize', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Intra-op X-Rays taken</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.intraOpXRays ?? ''}
              disabled={disabled}
              onChange={(e) => set('intraOpXRays', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Patient position */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Patient Position (tick)
        </div>
        <div className="flex flex-wrap items-center gap-5">
          {(['Prone', 'Supine', 'Lateral', 'Lithotomy', 'Other'] as PatientPosition[]).map((p) => (
            <TickOption
              key={p}
              label={p}
              checked={data.patientPosition === p}
              disabled={disabled}
              onChange={() => set('patientPosition', singleSelect(data.patientPosition, p))}
            />
          ))}
          {data.patientPosition === 'Other' && (
            <input
              className="h-9 px-3 border rounded-md text-sm"
              value={data.patientPositionOther ?? ''}
              disabled={disabled}
              placeholder="Other…"
              onChange={(e) => set('patientPositionOther', e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Skin prep */}
      <div className="border border-slate-200 rounded-md p-4 bg-white space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Skin Prep
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Shaved by</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.shavedBy ?? ''}
              disabled={disabled}
              onChange={(e) => set('shavedBy', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Prep (tick)</label>
            <div className="flex flex-wrap items-center gap-5">
              {(
                ['Hibitane in Spirit', 'Povidone Iodine', 'Hibitane in Water', 'Other'] as SkinPrepAgent[]
              ).map((agent) => (
                <TickOption
                  key={agent}
                  label={agent}
                  checked={(data.skinPrepAgents ?? []).includes(agent)}
                  disabled={disabled}
                  onChange={(next) => set('skinPrepAgents', setArrayToggle(data.skinPrepAgents ?? [], agent, next))}
                />
              ))}
              {(data.skinPrepAgents ?? []).includes('Other') && (
                <input
                  className="h-9 px-3 border rounded-md text-sm"
                  value={data.skinPrepOther ?? ''}
                  disabled={disabled}
                  placeholder="Other…"
                  onChange={(e) => set('skinPrepOther', e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Electrosurgical unit */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Electrosurgical Unit
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit No.</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.electrosurgicalUnitNo ?? ''}
              disabled={disabled}
              onChange={(e) => set('electrosurgicalUnitNo', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.electrosurgicalMode ?? ''}
              disabled={disabled}
              onChange={(e) => set('electrosurgicalMode', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Coat. Set</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.coatSet ?? ''}
              disabled={disabled}
              onChange={(e) => set('coatSet', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cut Set</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.cutSet ?? ''}
              disabled={disabled}
              onChange={(e) => set('cutSet', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Skin checked before</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.electrosurgicalSkinCheckedBefore ?? ''}
              disabled={disabled}
              onChange={(e) => set('electrosurgicalSkinCheckedBefore', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Skin checked after</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.electrosurgicalSkinCheckedAfter ?? ''}
              disabled={disabled}
              onChange={(e) => set('electrosurgicalSkinCheckedAfter', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tourniquet */}
      <div className="border border-slate-200 rounded-md p-4 bg-white space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Tourniquet
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetType ?? ''} disabled={disabled} onChange={(e) => set('tourniquetType', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Site</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetSite ?? ''} disabled={disabled} onChange={(e) => set('tourniquetSite', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rt./Lt.</label>
            <div className="flex items-center gap-4 h-10">
              {(['Rt.', 'Lt.'] as TourniquetSide[]).map((s) => (
                <TickOption
                  key={s}
                  label={s}
                  checked={data.tourniquetSide === s}
                  disabled={disabled}
                  onChange={() => set('tourniquetSide', singleSelect(data.tourniquetSide, s))}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pressure</label>
            <input
              type="number"
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.tourniquetPressure ?? ''}
              disabled={disabled}
              onChange={(e) => set('tourniquetPressure', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time on</label>
            <input type="time" className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetTimeOn ?? ''} disabled={disabled} onChange={(e) => set('tourniquetTimeOn', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time off</label>
            <input type="time" className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetTimeOff ?? ''} disabled={disabled} onChange={(e) => set('tourniquetTimeOff', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Skin checked before</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetSkinCheckedBefore ?? ''} disabled={disabled} onChange={(e) => set('tourniquetSkinCheckedBefore', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Skin checked after</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.tourniquetSkinCheckedAfter ?? ''} disabled={disabled} onChange={(e) => set('tourniquetSkinCheckedAfter', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Drain type / wound irrigation / wound pack / wound class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Drain Type (tick)
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {(['Corrugated', 'Portovac', 'UWS', 'NG', 'Other'] as DrainType[]).map((t) => (
              <TickOption
                key={t}
                label={t}
                checked={(data.drainTypes ?? []).includes(t)}
                disabled={disabled}
                onChange={(next) => set('drainTypes', setArrayToggle(data.drainTypes ?? [], t, next))}
              />
            ))}
            {(data.drainTypes ?? []).includes('Other') && (
              <input
                className="h-9 px-3 border rounded-md text-sm"
                value={data.drainTypeOther ?? ''}
                disabled={disabled}
                placeholder="Other…"
                onChange={(e) => set('drainTypeOther', e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Wound Irrigation (tick)
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {(['Saline', 'Water', 'Povidone Iodine', 'Antibiotic', 'Other'] as WoundIrrigation[]).map((t) => (
              <TickOption
                key={t}
                label={t}
                checked={(data.woundIrrigation ?? []).includes(t)}
                disabled={disabled}
                onChange={(next) => set('woundIrrigation', setArrayToggle(data.woundIrrigation ?? [], t, next))}
              />
            ))}
            {(data.woundIrrigation ?? []).includes('Other') && (
              <input
                className="h-9 px-3 border rounded-md text-sm"
                value={data.woundIrrigationOther ?? ''}
                disabled={disabled}
                placeholder="Other…"
                onChange={(e) => set('woundIrrigationOther', e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Wound Pack
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.woundPackType ?? ''} disabled={disabled} onChange={(e) => set('woundPackType', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Site</label>
              <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.woundPackSite ?? ''} disabled={disabled} onChange={(e) => set('woundPackSite', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Wound Class (tick)
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {(['Clean', 'Clean Contaminated', 'Contaminated', 'Infected'] as WoundClass[]).map((wc) => (
              <TickOption
                key={wc}
                label={wc}
                checked={data.woundClass === wc}
                disabled={disabled}
                onChange={() => set('woundClass', singleSelect(data.woundClass, wc))}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Surgical team & anaesthesia */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Surgical Team &amp; Anaesthesia
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Surgeon</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.surgeon ?? ''} disabled={disabled} onChange={(e) => set('surgeon', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assistant</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.assistant ?? ''} disabled={disabled} onChange={(e) => set('assistant', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Anaesthesiologist</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.anaesthesiologist ?? ''} disabled={disabled} onChange={(e) => set('anaesthesiologist', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Scrub nurse</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.scrubNurse ?? ''} disabled={disabled} onChange={(e) => set('scrubNurse', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Circulating nurse</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.circulatingNurse ?? ''} disabled={disabled} onChange={(e) => set('circulatingNurse', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observers / other</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.observers ?? ''} disabled={disabled} onChange={(e) => set('observers', e.target.value)} />
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
            Type of anaesthesia (tick)
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {(['General', 'Spinal', 'Regional', 'Local'] as AnaesthesiaType[]).map((t) => (
              <TickOption
                key={t}
                label={t}
                checked={data.anaesthesiaType === t}
                disabled={disabled}
                onChange={() => set('anaesthesiaType', singleSelect(data.anaesthesiaType, t))}
              />
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Detail</label>
            <input
              className="w-full h-10 px-3 border rounded-md text-sm"
              value={data.anaesthesiaDetail ?? ''}
              disabled={disabled}
              onChange={(e) => set('anaesthesiaDetail', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Diagnosis & operation */}
      <div className="border border-slate-200 rounded-md p-4 bg-white space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Diagnosis &amp; Operation
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pre-op diagnosis</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.preOpDiagnosis ?? ''} disabled={disabled} onChange={(e) => set('preOpDiagnosis', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Intra-op diagnosis</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.intraOpDiagnosis ?? ''} disabled={disabled} onChange={(e) => set('intraOpDiagnosis', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Operation(s)</label>
            <input className="w-full h-10 px-3 border rounded-md text-sm" value={data.operationsPerformed ?? ''} disabled={disabled} onChange={(e) => set('operationsPerformed', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
