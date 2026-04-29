'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

interface Props {
  value: SurgeonOperativeNoteDraft['header'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['header']>) => void;
  caseProcedureName?: string | null;
}

const ANESTHESIA_TYPE_OPTIONS = ['GENERAL', 'REGIONAL', 'LOCAL', 'SEDATION', 'TIVA', 'MAC'] as const;

export function HeaderSection({ value, disabled, onChange, caseProcedureName }: Props) {
  const v: any = value ?? {};

  const handleCheckboxChange = (field: 'shavingY' | 'shavingN' | 'skinPrepY' | 'skinPrepN') => {
    const current = v[field] === true;
    const updates: any = { ...(value ?? {}), [field]: !current };
    // Enforce mutual exclusivity for Y/N pairs
    if (field === 'shavingY' && !current) {
      updates.shavingN = false;
    } else if (field === 'shavingN' && !current) {
      updates.shavingY = false;
    } else if (field === 'skinPrepY' && !current) {
      updates.skinPrepN = false;
    } else if (field === 'skinPrepN' && !current) {
      updates.skinPrepY = false;
    }
    onChange(updates);
  };

  return (
    <div className="space-y-6">
      {/* Pre-operative Diagnosis */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
          PRE-OPERATIVE DIAGNOSIS
        </label>
        <input
          className="w-full h-10 px-3 border rounded-md text-sm"
          value={v.diagnosisPreOp ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...(value ?? {}), diagnosisPreOp: e.target.value } as any)}
        />
      </div>

      {/* Operative Diagnosis */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
          OPERATIVE DIAGNOSIS
        </label>
        <input
          className="w-full h-10 px-3 border rounded-md text-sm"
          value={v.diagnosisPostOp ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...(value ?? {}), diagnosisPostOp: e.target.value } as any)}
        />
      </div>

      {/* Procedure Planned */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
          PROCEDURE(S) PLANNED
        </label>
        <input
          className="w-full h-10 px-3 border rounded-md text-sm"
          value={v.procedurePlanned || caseProcedureName || ''}
          placeholder={caseProcedureName ? `From case plan: ${caseProcedureName}` : undefined}
          disabled={disabled}
          onChange={(e) => onChange({ ...(value ?? {}), procedurePlanned: e.target.value } as any)}
        />
      </div>

      {/* Operation(s) */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
          OPERATION(S)
        </label>
        <input
          className="w-full h-10 px-3 border rounded-md text-sm"
          value={v.procedurePerformed ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...(value ?? {}), procedurePerformed: e.target.value } as any)}
        />
      </div>

      {/* Shaving */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-700 mb-3">
          SHAVING
        </label>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.shavingY === true}
              disabled={disabled}
              onChange={() => handleCheckboxChange('shavingY')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Y</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.shavingN === true}
              disabled={disabled}
              onChange={() => handleCheckboxChange('shavingN')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>N</span>
          </label>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            EXTENT
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={v.shavingExtent ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), shavingExtent: e.target.value } as any)}
          />
        </div>
      </div>

      {/* Skin Prep */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-700 mb-3">
          SKIN PREP
        </label>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.skinPrepY === true}
              disabled={disabled}
              onChange={() => handleCheckboxChange('skinPrepY')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Y</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.skinPrepN === true}
              disabled={disabled}
              onChange={() => handleCheckboxChange('skinPrepN')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>N</span>
          </label>
        </div>
      </div>

      {/* Anaesthesia Type */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
          ANAESTHESIA TYPE
        </label>
        <select
          className="w-full h-10 px-3 border rounded-md text-sm bg-white"
          value={v.anesthesiaType ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...(value ?? {}), anesthesiaType: e.target.value } as any)}
        >
          <option value="">— Select —</option>
          {ANESTHESIA_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
