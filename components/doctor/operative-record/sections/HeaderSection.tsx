'use client';

import { useState } from 'react';
import { Copy, Plus, X } from 'lucide-react';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { Button } from '@/components/ui/button';
import { ChoicePill, TextInput, TypeField, YesNoToggle, stripToPlain } from '../ui';

interface Props {
  value: SurgeonOperativeNoteDraft['header'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['header']>) => void;
  caseProcedureName?: string | null;
  initialDiagnosis?: string;
  surgeonNameHint?: string | null;
}

const ANESTHESIA_TYPE_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'SEDATION', label: 'Sedation' },
  { value: 'TIVA', label: 'TIVA' },
  { value: 'MAC', label: 'MAC' },
] as const;

const SIDE_OPTIONS = ['Left', 'Right', 'Bilateral', 'N/A'] as const;

export function HeaderSection({
  value,
  disabled,
  onChange,
  caseProcedureName,
  initialDiagnosis,
  surgeonNameHint,
}: Props) {
  const v = value ?? ({} as NonNullable<SurgeonOperativeNoteDraft['header']>);
  const [assistantDraft, setAssistantDraft] = useState('');

  const patch = (partial: Partial<NonNullable<SurgeonOperativeNoteDraft['header']>>) => {
    onChange({ ...v, ...partial } as NonNullable<SurgeonOperativeNoteDraft['header']>);
  };

  const shaving: 'Y' | 'N' | null = v.shavingY ? 'Y' : v.shavingN ? 'N' : null;
  const skinPrep: 'Y' | 'N' | null = v.skinPrepY ? 'Y' : v.skinPrepN ? 'N' : null;
  const assistants = Array.isArray(v.assistants) ? v.assistants : [];

  const addAssistant = () => {
    const name = assistantDraft.trim();
    if (!name || disabled) return;
    if (assistants.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setAssistantDraft('');
      return;
    }
    patch({
      assistants: [...assistants, { userId: '', name, role: 'ASSISTANT_SURGEON' }],
    });
    setAssistantDraft('');
  };

  const removeAssistant = (idx: number) => {
    patch({ assistants: assistants.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-7">
      {/* Diagnoses */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Diagnoses
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TypeField
            label="Pre-op"
            value={stripToPlain(v.diagnosisPreOp)}
            onChange={(diagnosisPreOp) => patch({ diagnosisPreOp })}
            placeholder={
              initialDiagnosis
                ? `Type diagnosis… (case plan: ${initialDiagnosis})`
                : 'Type pre-operative diagnosis…'
            }
            disabled={disabled}
            rows={3}
          />
          <div className="space-y-2">
            <TypeField
              label="Operative"
              value={stripToPlain(v.diagnosisPostOp)}
              onChange={(diagnosisPostOp) => patch({ diagnosisPostOp })}
              placeholder="Type operative diagnosis…"
              disabled={disabled}
              rows={3}
            />
            {!disabled && stripToPlain(v.diagnosisPreOp) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-slate-500"
                onClick={() => patch({ diagnosisPostOp: stripToPlain(v.diagnosisPreOp) })}
              >
                <Copy className="h-3 w-3" />
                Same as pre-op
              </Button>
            ) : null}
          </div>
        </div>
      </fieldset>

      {/* Procedures */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Procedures
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TypeField
            label="Planned"
            value={stripToPlain(v.procedurePlanned)}
            onChange={(procedurePlanned) => patch({ procedurePlanned })}
            placeholder={
              caseProcedureName
                ? `Type planned… (scheduled: ${caseProcedureName})`
                : 'Type planned procedure(s)…'
            }
            disabled={disabled}
            rows={2}
          />
          <div className="space-y-2">
            <TypeField
              label="Performed"
              value={stripToPlain(v.procedurePerformed)}
              onChange={(procedurePerformed) => patch({ procedurePerformed })}
              placeholder="Type procedure(s) performed…"
              disabled={disabled}
              rows={2}
            />
            {!disabled && stripToPlain(v.procedurePlanned) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-slate-500"
                onClick={() =>
                  patch({ procedurePerformed: stripToPlain(v.procedurePlanned) })
                }
              >
                <Copy className="h-3 w-3" />
                Use planned
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-600">Side</p>
          <div className="flex flex-wrap gap-2">
            {SIDE_OPTIONS.map((side) => (
              <ChoicePill
                key={side}
                selected={(v.side || '') === side}
                disabled={disabled}
                onClick={() => patch({ side: v.side === side ? '' : side })}
              >
                {side}
              </ChoicePill>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Team */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Team
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Surgeon"
            value={v.surgeonName || surgeonNameHint || ''}
            onChange={(surgeonName) => patch({ surgeonName })}
            placeholder="Type surgeon name…"
            disabled={disabled}
          />
          <TextInput
            label="Anaesthesiologist"
            value={v.anesthesiologistName || ''}
            onChange={(anesthesiologistName) => patch({ anesthesiologistName })}
            placeholder="Type anaesthesiologist name…"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Assistants</p>
          {assistants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assistants.map((a, idx) => (
                <span
                  key={`${a.name}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                >
                  {a.name}
                  {!disabled ? (
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => removeAssistant(idx)}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
          {!disabled ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={assistantDraft}
                onChange={(e) => setAssistantDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAssistant();
                  }
                }}
                placeholder="Type assistant name and press Enter…"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-1"
                onClick={addAssistant}
                disabled={!assistantDraft.trim()}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          ) : null}
        </div>
      </fieldset>

      {/* Anaesthesia & prep */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Anaesthesia &amp; prep
        </legend>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-600">Type</p>
          <div className="flex flex-wrap gap-2">
            {ANESTHESIA_TYPE_OPTIONS.map((opt) => (
              <ChoicePill
                key={opt.value}
                selected={v.anesthesiaType === opt.value}
                disabled={disabled}
                onClick={() => patch({ anesthesiaType: opt.value })}
              >
                {opt.label}
              </ChoicePill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">Shaving</p>
            <YesNoToggle
              value={shaving}
              disabled={disabled}
              onChange={(next) =>
                patch({
                  shavingY: next === 'Y',
                  shavingN: next === 'N',
                })
              }
            />
            {shaving === 'Y' ? (
              <TextInput
                label="Extent"
                value={v.shavingExtent || ''}
                onChange={(shavingExtent) => patch({ shavingExtent })}
                placeholder="Type extent…"
                disabled={disabled}
              />
            ) : null}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">Skin prep</p>
            <YesNoToggle
              value={skinPrep}
              disabled={disabled}
              onChange={(next) =>
                patch({
                  skinPrepY: next === 'Y',
                  skinPrepN: next === 'N',
                })
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
